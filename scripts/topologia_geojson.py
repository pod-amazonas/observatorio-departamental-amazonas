#!/usr/bin/env python3
"""Validador topológico exacto para polígonos GeoJSON, sin dependencias externas.

Trabaja con los mismos números binarios (double) que leen Python y Leaflet: cada
coordenada se convierte en un entero exacto con una escala común 2^K, así que los
predicados de orientación no tienen error de redondeo.

Reglas por entidad (Polygon o MultiPolygon), solo con X e Y:
  1. Cada anillo está cerrado, tiene al menos 4 posiciones y área distinta de cero.
  2. Ningún par de segmentos se cruza ni se solapa. Los contactos en un solo punto
     (permitidos por OGC entre anillos distintos) se devuelven aparte, por par de anillos,
     para que quien redondea compruebe que no aparecen contactos nuevos.
  3. Cada hueco está estrictamente dentro de su exterior y fuera de los demás huecos.
  4. Las partes de un MultiPolygon no se solapan (una parte puede estar dentro de un hueco de otra).

Un contacto de un anillo consigo mismo (vértice sobre otro tramo del mismo anillo) se
cuenta como problema, como en OGC. No verifica la conectividad del interior cuando hay
varios contactos; por eso al redondear se exige no crear contactos nuevos.

Uso: python3 scripts/topologia_geojson.py archivo.geojson ...   (sale con 1 si hay problemas)
"""
import json
import sys
from collections import defaultdict


class Problema(Exception):
    pass


def _escala(partes):
    k = 0
    for anillos in partes:
        for anillo in anillos:
            for p in anillo:
                for v in p[:2]:
                    d = float(v).as_integer_ratio()[1]
                    k = max(k, d.bit_length() - 1)
    return k


def _a_enteros(partes, k):
    s = 1 << k

    def conv(v):
        n, d = float(v).as_integer_ratio()
        return n * (s // d)
    return [[[(conv(p[0]), conv(p[1])) for p in anillo] for anillo in anillos] for anillos in partes]


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
                # cruza la horizontal de p; ¿a la derecha de p?
                s = _orient(a, b, p)
                if (b[1] > a[1] and s > 0) or (b[1] < a[1] and s < 0):
                    dentro = not dentro
        return 1 if dentro else 0


def analizar(partes):
    """Devuelve (problemas, contactos, orientaciones).

    problemas: {índice de parte: [descripciones]}.
    contactos: {((parte, anillo), (parte, anillo)): {puntos}} con los contactos en un punto.
    orientaciones: {(parte, anillo): signo del área}.
    """
    malos = defaultdict(list)
    contactos = defaultdict(set)
    if not partes:
        return malos, contactos, {}
    ent = _a_enteros(partes, _escala(partes))

    orientaciones = {}
    # Regla 1
    for i, anillos in enumerate(ent):
        for j, r in enumerate(anillos):
            if len(r) < 4 or r[0] != r[-1]:
                malos[i].append(f'anillo {j + 1}: abierto o con menos de 4 posiciones')
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
    if not segs:
        return malos, contactos, orientaciones
    largos = sorted(max(abs(a[0] - b[0]), abs(a[1] - b[1])) for a, b, *_ in segs)
    celda = max(1, largos[len(largos) // 2] * 4)
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
                # probar cada par una sola vez: en la celda de la esquina inferior de la intersección de cajas
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
                if tipo == 'cruce' or tipo == 'solape':
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
                    clave = tuple(sorted(((p1, r1), (p2, r2))))
                    contactos[clave].add(punto)

    # Reglas 3 y 4: punto en polígono con índice por filas
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

    def lugar(p, i, j):
        """Posición de p respecto al anillo (i, j): 1 dentro, 0 fuera, -1 borde."""
        return indice(i, j).contiene(p) if en_caja(p, cajas_anillo[(i, j)]) else 0

    def vertice_libre(anillo, i, excluir=None):
        """Un vértice de `anillo` que no esté sobre ningún borde de la parte i (o None)."""
        for q in anillo:
            if all(lugar(q, i, h) != -1 for h in range(len(ent[i])) if h != excluir and ent[i][h]):
                return q
        return None

    def dentro_de_parte(p, k):
        return lugar(p, k, 0) == 1 and not any(lugar(p, k, h) == 1 for h in range(1, len(ent[k])))

    for i, anillos in enumerate(ent):
        if not anillos or i in malos:
            continue
        for j in range(1, len(anillos)):
            p = vertice_libre(anillos[j], i, excluir=j)
            if p is None:
                continue  # todo el hueco apoyado en bordes: lo cubren las reglas de contacto
            if lugar(p, i, 0) != 1:
                malos[i].append(f'hueco {j}: fuera de su exterior')
            elif any(h != j and lugar(p, i, h) == 1 for h in range(1, len(anillos))):
                malos[i].append(f'hueco {j}: dentro de otro hueco')
    for i, anillos in enumerate(ent):
        if not anillos or not anillos[0]:
            continue
        ci = cajas_anillo[(i, 0)]
        for k, otros in enumerate(ent):
            if k == i or not otros or not otros[0]:
                continue
            ck = cajas_anillo[(k, 0)]
            if ci[0] > ck[2] or ck[0] > ci[2] or ci[1] > ck[3] or ck[1] > ci[3]:
                continue
            p = vertice_libre(anillos[0], k)
            if p is not None and dentro_de_parte(p, k):
                malos[i].append(f'solapa la parte {k + 1}')
                malos[k].append(f'solapa la parte {i + 1}')
    return malos, contactos, orientaciones


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
    datos = json.load(open(ruta, encoding='utf-8'))
    salida = []
    for nf, f in enumerate(datos.get('features', []), 1):
        partes = partes_de(f.get('geometry'))
        if partes is None:
            continue
        for i, motivos in sorted(problemas_por_parte(partes).items()):
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
