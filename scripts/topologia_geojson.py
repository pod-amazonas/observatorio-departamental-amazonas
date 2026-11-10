#!/usr/bin/env python3
"""Validador topológico exacto para polígonos GeoJSON, sin dependencias externas.

Trabaja con los mismos números binarios (double) que leen Python y Leaflet: cada
coordenada se convierte en un entero exacto con una escala común 2^K, así que los
predicados de orientación no tienen error de redondeo. Solo usa X e Y.

Reglas por entidad (Polygon o MultiPolygon), alineadas con la validez OGC/GEOS:
  1. Cada anillo está cerrado, tiene al menos 3 vértices distintos y área distinta de cero.
     Los vértices consecutivos repetidos se ignoran al validar (son válidos en OGC).
  2. Ningún par de segmentos se cruza ni se solapa, y ningún anillo se toca a sí mismo.
     Se admiten contactos en un punto entre anillos distintos.
  3. Interior conexo: dentro de cada polígono, el grafo «anillo — punto de contacto» no
     tiene ciclos. Un hueco que toca el exterior en dos puntos, o una cadena de huecos que
     une dos puntos del exterior, parten el interior y se rechazan.
  4. Cada hueco está dentro de su exterior y fuera de los demás huecos. Si dos anillos se
     tocan, se comprueba cada vértice y el punto medio de cada tramo, no un solo vértice.
  5. Las partes de un MultiPolygon no se solapan (una parte puede estar dentro de un hueco
     de otra), con la misma comprobación por tramos cuando se tocan.

Además devuelve la estructura de contactos (qué anillos coinciden en cada punto) y la
orientación de cada anillo, para que quien redondea exija que no cambien.

Uso: python3 scripts/topologia_geojson.py archivo.geojson ...   (sale con 1 si hay problemas)
"""
import json
import math
import sys
from collections import Counter, defaultdict


class Problema(Exception):
    pass


def _rechazar_constante(nombre):
    raise Problema(f'valor no permitido en JSON: {nombre}')


def cargar_json(texto_o_archivo):
    """json.loads/json.load que rechaza NaN, Infinity y -Infinity."""
    if hasattr(texto_o_archivo, 'read'):
        return json.load(texto_o_archivo, parse_constant=_rechazar_constante)
    return json.loads(texto_o_archivo, parse_constant=_rechazar_constante)


def _escala(partes):
    k = 0
    for anillos in partes:
        for anillo in anillos:
            for p in anillo:
                for v in p[:2]:
                    if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v):
                        raise Problema(f'coordenada no finita o no numérica: {v!r}')
                    d = float(v).as_integer_ratio()[1]
                    k = max(k, d.bit_length() - 1)
    return k + 1  # +1: todas las coordenadas quedan pares y los puntos medios son exactos


def _a_enteros(partes, k):
    s = 1 << k

    def conv(v):
        n, d = float(v).as_integer_ratio()
        return n * (s // d)

    salida = []
    for anillos in partes:
        nuevos = []
        for anillo in anillos:
            r = []
            for p in anillo:
                q = (conv(p[0]), conv(p[1]))
                if not r or q != r[-1]:
                    r.append(q)
            nuevos.append(r)
        salida.append(nuevos)
    return salida


def _orient(a, b, c):
    v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    return (v > 0) - (v < 0)


def _en_caja(a, b, c):
    """c está en la caja de a-b (usar solo si son colineales)."""
    return min(a[0], b[0]) <= c[0] <= max(a[0], b[0]) and min(a[1], b[1]) <= c[1] <= max(a[1], b[1])


def _contacto(p1, p2, q1, q2):
    """(None|'cruce'|'solape'|'punto', punto de contacto)."""
    o1, o2, o3, o4 = _orient(p1, p2, q1), _orient(p1, p2, q2), _orient(q1, q2, p1), _orient(q1, q2, p2)
    if o1 != o2 and o3 != o4 and 0 not in (o1, o2, o3, o4):
        return 'cruce', None
    if o1 == o2 == 0:  # colineales
        comunes = {q for q in (q1, q2) if _en_caja(p1, p2, q)} | {p for p in (p1, p2) if _en_caja(q1, q2, p)}
        if not comunes:
            return None, None
        return ('punto', comunes.pop()) if len(comunes) == 1 else ('solape', None)
    for o, a, b, q in ((o1, p1, p2, q1), (o2, p1, p2, q2), (o3, q1, q2, p1), (o4, q1, q2, p2)):
        if o == 0 and _en_caja(a, b, q):
            return 'punto', q
    return None, None


def area2(anillo):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(anillo, anillo[1:]))


class _IndiceFilas:
    """Segmentos de un anillo agrupados por franjas horizontales, para punto en polígono rápido."""

    def __init__(self, anillo, alto):
        self.alto = alto
        self.filas = defaultdict(list)
        for a, b in zip(anillo, anillo[1:]):
            for f in range(min(a[1], b[1]) // alto, max(a[1], b[1]) // alto + 1):
                self.filas[f].append((a, b))

    def contiene(self, p):
        """1 dentro, 0 fuera, -1 sobre el borde."""
        x, y = p
        dentro = False
        for a, b in self.filas.get(y // self.alto, ()):
            if _orient(a, b, p) == 0 and _en_caja(a, b, p):
                return -1
            if (a[1] > y) != (b[1] > y):
                s = _orient(a, b, p)
                if (b[1] > a[1] and s > 0) or (b[1] < a[1] and s < 0):
                    dentro = not dentro
        return 1 if dentro else 0


class _Conjuntos:
    def __init__(self):
        self.padre = {}

    def raiz(self, x):
        self.padre.setdefault(x, x)
        while self.padre[x] != x:
            self.padre[x] = self.padre[self.padre[x]]
            x = self.padre[x]
        return x

    def unir(self, a, b):
        """Une y devuelve False si ya estaban unidos (hay un ciclo)."""
        ra, rb = self.raiz(a), self.raiz(b)
        if ra == rb:
            return False
        self.padre[ra] = rb
        return True


def analizar(partes):
    """Devuelve (problemas, estructura, orientaciones).

    problemas: {índice de parte: [descripciones]}.
    estructura: Counter de frozenset({(parte, anillo), ...}) por cada punto de contacto.
    orientaciones: {(parte, anillo): signo del área}.
    """
    malos = defaultdict(list)
    if not partes:
        return malos, Counter(), {}
    ent = _a_enteros(partes, _escala(partes))

    orientaciones = {}
    # Regla 1
    for i, anillos in enumerate(ent):
        for j, r in enumerate(anillos):
            if len(r) < 4 or r[0] != r[-1]:
                malos[i].append(f'anillo {j + 1}: abierto o con menos de 3 vértices distintos')
            else:
                a = area2(r)
                orientaciones[(i, j)] = (a > 0) - (a < 0)
                if a == 0:
                    malos[i].append(f'anillo {j + 1}: área cero')

    # Regla 2: rejilla de segmentos
    segs = []  # (a, b, parte, anillo, índice, n)
    for i, anillos in enumerate(ent):
        for j, r in enumerate(anillos):
            n = len(r) - 1
            for t in range(n):
                segs.append((r[t], r[t + 1], i, j, t, n))
    puntos = defaultdict(set)  # punto de contacto -> {(parte, anillo)}
    if segs:
        largos = sorted(max(abs(a[0] - b[0]), abs(a[1] - b[1])) for a, b, *_ in segs)
        celda = max(2, largos[len(largos) // 2] * 4)
    else:
        celda = 2
    rejilla = defaultdict(list)
    cajas = []
    for s, (a, b, *_r) in enumerate(segs):
        x0, x1 = sorted((a[0], b[0]))
        y0, y1 = sorted((a[1], b[1]))
        cajas.append((x0, y0, x1, y1))
        for cx in range(x0 // celda, x1 // celda + 1):
            for cy in range(y0 // celda, y1 // celda + 1):
                rejilla[(cx, cy)].append(s)
    for (cx, cy), ids in rejilla.items():
        for u in range(len(ids)):
            s1 = ids[u]
            a1, b1, p1, r1, t1, n1 = segs[s1]
            c1 = cajas[s1]
            for v in range(u + 1, len(ids)):
                s2 = ids[v]
                c2 = cajas[s2]
                if c1[0] > c2[2] or c2[0] > c1[2] or c1[1] > c2[3] or c2[1] > c1[3]:
                    continue
                # cada par se prueba una sola vez: en la celda de la esquina inferior de la intersección de cajas
                if (max(c1[0], c2[0]) // celda, max(c1[1], c2[1]) // celda) != (cx, cy):
                    continue
                a2, b2, p2, r2, t2, n2 = segs[s2]
                if p1 == p2 and r1 == r2 and ((t1 + 1) % n1 == t2 or (t2 + 1) % n1 == t1):
                    # consecutivos: solo comparten el vértice común; no deben solaparse
                    if (t1 + 1) % n1 == t2:
                        u_, v_, w_ = a1, b1, b2
                    else:
                        u_, v_, w_ = a2, b2, b1
                    if n1 == 2 or (_orient(u_, v_, w_) == 0 and
                                   (u_[0] - v_[0]) * (w_[0] - v_[0]) + (u_[1] - v_[1]) * (w_[1] - v_[1]) > 0):
                        malos[p1].append(f'anillo {r1 + 1}: segmentos consecutivos solapados')
                    continue
                tipo, punto = _contacto(a1, b1, a2, b2)
                if tipo is None:
                    continue
                if tipo in ('cruce', 'solape'):
                    if p1 == p2 and r1 == r2:
                        malos[p1].append(f'anillo {r1 + 1}: autointersección ({tipo})')
                    elif p1 == p2:
                        malos[p1].append(f'anillos {r1 + 1} y {r2 + 1}: {tipo}')
                    else:
                        malos[p1].append(f'{tipo} con la parte {p2 + 1}')
                        malos[p2].append(f'{tipo} con la parte {p1 + 1}')
                elif p1 == p2 and r1 == r2:
                    malos[p1].append(f'anillo {r1 + 1}: se toca a sí mismo')
                else:
                    puntos[punto].update(((p1, r1), (p2, r2)))

    estructura = Counter(frozenset(anillos) for anillos in puntos.values())

    # Regla 3: interior conexo (sin ciclos anillo—punto dentro de cada polígono)
    grafo = defaultdict(_Conjuntos)
    for punto, anillos in puntos.items():
        por_parte = defaultdict(set)
        for (i, j) in anillos:
            por_parte[i].add(j)
        for i, js in por_parte.items():
            if len(js) < 2:
                continue
            for j in js:
                if not grafo[i].unir(('anillo', j), ('punto', punto)):
                    malos[i].append('interior desconectado por contactos entre anillos')

    # contactos entre anillos (para decidir si hace falta comprobar por tramos)
    se_tocan = set()
    for anillos in puntos.values():
        for x in anillos:
            for y in anillos:
                if x != y:
                    se_tocan.add((x, y))

    # Reglas 4 y 5: punto en polígono con índice por filas
    alto = celda
    indices = {}

    def indice(i, j):
        if (i, j) not in indices:
            indices[(i, j)] = _IndiceFilas(ent[i][j], alto)
        return indices[(i, j)]

    def caja(r):
        xs = [p[0] for p in r]
        ys = [p[1] for p in r]
        return min(xs), min(ys), max(xs), max(ys)

    def en_caja(p, c):
        return c[0] <= p[0] <= c[2] and c[1] <= p[1] <= c[3]

    cajas_anillo = {(i, j): caja(r) for i, anillos in enumerate(ent) for j, r in enumerate(anillos) if r}

    # índice espacial de anillos por parte: celda gruesa -> anillos cuya caja la toca
    grueso = celda * 32
    rejilla_anillos = {}

    def anillos_cerca(p, i):
        if i not in rejilla_anillos:
            g = defaultdict(list)
            for h, r in enumerate(ent[i]):
                if len(r) < 4:
                    continue
                c = cajas_anillo[(i, h)]
                for gx in range(c[0] // grueso, c[2] // grueso + 1):
                    for gy in range(c[1] // grueso, c[3] // grueso + 1):
                        g[(gx, gy)].append(h)
            rejilla_anillos[i] = g
        return rejilla_anillos[i].get((p[0] // grueso, p[1] // grueso), ())

    def lugar(p, i, j):
        """Posición de p respecto al anillo (i, j): 1 dentro, 0 fuera, -1 borde."""
        return indice(i, j).contiene(p) if en_caja(p, cajas_anillo[(i, j)]) else 0

    def muestras(anillo, por_tramos):
        """Vértices y, si se pide, puntos medios de cada tramo (exactos: coordenadas pares)."""
        yield from anillo[:-1]
        if por_tramos:
            for a, b in zip(anillo, anillo[1:]):
                yield ((a[0] + b[0]) // 2, (a[1] + b[1]) // 2)

    muestras_por_celda = {}

    def puntos_libres(anillo, i, excluir, por_tramos, filtro=None):
        """Muestras de `anillo` (dentro de la caja `filtro`, si se da) que no están sobre ningún borde de la parte i."""
        libres = []
        if filtro is not None:
            # muestras agrupadas por celda gruesa (se calculan una vez por anillo)
            clave = id(anillo)
            if clave not in muestras_por_celda:
                g = defaultdict(list)
                for q in muestras(anillo, True):
                    g[(q[0] // grueso, q[1] // grueso)].append(q)
                muestras_por_celda[clave] = g
            g = muestras_por_celda[clave]
            candidatas = (q for gx in range(filtro[0] // grueso, filtro[2] // grueso + 1)
                          for gy in range(filtro[1] // grueso, filtro[3] // grueso + 1)
                          for q in g.get((gx, gy), ()) if en_caja(q, filtro))
        else:
            candidatas = muestras(anillo, por_tramos)
        for q in candidatas:
            if all(lugar(q, i, h) != -1 for h in anillos_cerca(q, i) if h != excluir):
                libres.append(q)
                if not por_tramos:
                    break
        return libres

    def dentro_de_parte(p, k):
        return lugar(p, k, 0) == 1 and not any(lugar(p, k, h) == 1 for h in anillos_cerca(p, k) if h != 0)

    for i, anillos in enumerate(ent):
        if not anillos or i in malos:
            continue
        for j in range(1, len(anillos)):
            tramos = any(((i, j), (i, h)) in se_tocan for h in range(len(anillos)) if h != j)
            for p in puntos_libres(anillos[j], i, j, tramos):
                if lugar(p, i, 0) != 1:
                    malos[i].append(f'hueco {j}: fuera de su exterior')
                    break
                if any(h not in (0, j) and lugar(p, i, h) == 1 for h in anillos_cerca(p, i)):
                    malos[i].append(f'hueco {j}: dentro de otro hueco')
                    break
    for i, anillos in enumerate(ent):
        if not anillos or len(anillos[0]) < 4:
            continue
        ci = cajas_anillo[(i, 0)]
        for k, otros in enumerate(ent):
            if k == i or not otros or len(otros[0]) < 4:
                continue
            ck = cajas_anillo[(k, 0)]
            if ci[0] > ck[2] or ck[0] > ci[2] or ci[1] > ck[3] or ck[1] > ci[3]:
                continue
            tramos = any(((i, 0), (k, h)) in se_tocan for h in range(len(otros)))
            # Sin contactos basta un vértice libre (todo el borde queda a un mismo lado).
            # Con contactos se prueban todos los tramos, pero solo los que caen en la caja de k.
            if any(dentro_de_parte(p, k) for p in puntos_libres(anillos[0], k, None, tramos, filtro=ck if tramos else None)):
                malos[i].append(f'solapa la parte {k + 1}')
                malos[k].append(f'solapa la parte {i + 1}')
    return malos, estructura, orientaciones


def problemas_por_parte(partes):
    return analizar(partes)[0]


def partes_de(g):
    if g is None:
        return []
    t = g.get('type')
    if t == 'Polygon':
        return [g['coordinates']]
    if t == 'MultiPolygon':
        return g['coordinates']
    return None  # no poligonal: estas reglas no aplican


def validar_archivo(ruta):
    try:
        datos = cargar_json(open(ruta, encoding='utf-8'))
    except Problema as e:
        return [f'{ruta}: {e}']
    salida = []
    for nf, f in enumerate(datos.get('features', []), 1):
        partes = partes_de(f.get('geometry'))
        if partes is None:
            continue
        try:
            problemas = problemas_por_parte(partes)
        except Problema as e:
            salida.append(f'{ruta}: entidad {nf}: {e}')
            continue
        for i, motivos in sorted(problemas.items()):
            for m in sorted(set(motivos)):
                salida.append(f'{ruta}: entidad {nf}, polígono {i + 1}: {m}')
    return salida


def main(rutas):
    if not rutas:
        print('Indica al menos un archivo GeoJSON.', file=sys.stderr)
        return 2
    todos = []
    for r in rutas:
        todos += validar_archivo(r)
    for linea in todos:
        print(linea)
    print(f'{len(rutas)} archivo(s) revisados, {len(todos)} problema(s).')
    return 1 if todos else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
