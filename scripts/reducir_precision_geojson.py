#!/usr/bin/env python3
"""Reduce la precisión de las coordenadas de los GeoJSON publicados para la web.

Qué hace:
  - Redondea X e Y a N decimales (por defecto 6: como máximo 0,08 m de corrimiento).
    Z y demás ordenadas se conservan tal cual.
  - Quita vértices consecutivos que quedan en la misma posición tras redondear.
  - Escribe JSON compacto. No toca propiedades, `name` ni `crs`.

Garantía topológica (ver scripts/topologia_geojson.py):
  - Un polígono redondeado se acepta solo si sigue siendo válido (anillos simples, área no
    nula, sin cruces ni solapes, huecos dentro de su exterior, partes sin solaparse), si no
    aparece ningún contacto nuevo entre anillos y si ningún anillo invierte su orientación.
  - Si no, ese polígono completo (exterior y todos sus huecos) conserva sus coordenadas
    originales. Nunca se repara, se elimina ni se simplifica una parte.
  - Si el original ya tuviera problemas, el archivo no se modifica.

Qué archivos procesa:
  - Solo las capas del catálogo `catalogo_determinantes_para_geovisor.json` con estado
    `aprobada_disponible_geojson`. Cualquier otro archivo se rechaza.
  - Como defensa adicional, rechaza archivos cuyo nombre, ruta, `name` o atributos mencionen
    «aislamiento». Esto no sustituye la revisión institucional de cada capa (AGENTS.md).

Uso:
  python3 scripts/reducir_precision_geojson.py              # procesa todas las capas autorizadas
  python3 scripts/reducir_precision_geojson.py --comprobar  # no escribe; falla si algo cambiaría
  python3 scripts/reducir_precision_geojson.py datos/.../determinante_01.geojson
"""
import argparse
import gzip
import json
import os
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from topologia_geojson import analizar, partes_de  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOGO = os.path.join(RAIZ, 'catalogo_determinantes_para_geovisor.json')
ESTADO_AUTORIZADO = 'aprobada_disponible_geojson'
PROHIBIDO = ('aislamiento',)
M_POR_GRADO = 111_320


class ErrorEntrada(Exception):
    pass


# ---------- autorización ----------

def capas_autorizadas():
    cat = json.load(open(CATALOGO, encoding='utf-8'))
    rutas = []
    for g in cat.get('grupos', []):
        for c in g.get('capas', []):
            if c.get('estado') == ESTADO_AUTORIZADO and c.get('archivo'):
                rutas.append(os.path.realpath(os.path.join(RAIZ, c['archivo'])))
    return rutas


def normalizar(texto):
    return ''.join(ch for ch in unicodedata.normalize('NFD', str(texto).lower()) if unicodedata.category(ch) != 'Mn')


def menciona_prohibido(valor):
    if isinstance(valor, dict):
        return any(menciona_prohibido(k) or menciona_prohibido(v) for k, v in valor.items())
    if isinstance(valor, list):
        return any(menciona_prohibido(v) for v in valor)
    return isinstance(valor, str) and any(p in normalizar(valor) for p in PROHIBIDO)


# ---------- redondeo ----------

def redondear(p, n):
    if not isinstance(p, list) or len(p) < 2 or not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in p):
        raise ErrorEntrada(f'posición no válida: {p!r}')
    return [round(p[0], n), round(p[1], n)] + p[2:]


def redondear_linea(linea, n):
    """Devuelve la línea redondeada sin repetidos consecutivos (en X e Y)."""
    salida = []
    for p in linea:
        q = redondear(p, n)
        if not salida or q[:2] != salida[-1][:2]:
            salida.append(q)
    return salida


def redondear_poligono(anillos, n):
    """Anillos redondeados, o None si alguno quedaría con menos de 4 posiciones."""
    if not anillos:
        raise ErrorEntrada('polígono sin anillos')
    nuevos = []
    for r in anillos:
        if not isinstance(r, list) or len(r) < 4:
            raise ErrorEntrada('anillo vacío o con menos de 4 posiciones en el original')
        q = redondear_linea(r, n)
        if len(q) < 4:
            return None
        nuevos.append(q)
    return nuevos


def procesar_poligonal(partes, n):
    """Redondea partes de un (Multi)Polygon con garantía topológica.

    Devuelve (partes_nuevas, conservadas) o (None, motivo) si el original ya tiene problemas.
    """
    for anillos in partes:
        if not anillos:
            raise ErrorEntrada('polígono sin anillos')
        for r in anillos:
            if not isinstance(r, list) or len(r) < 4:
                raise ErrorEntrada('anillo vacío o con menos de 4 posiciones en el original')
            for p in r:
                redondear(p, n)  # valida cada posición
    malos0, contactos0, orient0 = analizar(partes)
    if malos0:
        i, motivos = next(iter(sorted(malos0.items())))
        return None, f'el original ya tiene problemas (polígono {i + 1}: {motivos[0]})'
    candidatas = [redondear_poligono(p, n) for p in partes]
    redondeada = [c is not None for c in candidatas]
    for _ in range(len(partes) + 1):
        actuales = [candidatas[i] if redondeada[i] else partes[i] for i in range(len(partes))]
        malos, contactos, orient = analizar(actuales)
        restaurar = set(malos)
        for clave, puntos in contactos.items():
            if len(puntos) > len(contactos0.get(clave, ())):
                restaurar |= {clave[0][0], clave[1][0]}
        for clave, signo in orient.items():
            if signo != orient0.get(clave):
                restaurar.add(clave[0])
        restaurar = {i for i in restaurar if redondeada[i]}
        if not restaurar:
            if malos:  # solo quedan problemas entre partes originales: se conserva todo
                return list(partes), len(partes)
            return actuales, redondeada.count(False)
        for i in restaurar:
            redondeada[i] = False
    return list(partes), len(partes)


def procesar_geometria(g, n, info):
    if g is None:
        return None
    t = g.get('type')
    c = g.get('coordinates')
    if t in ('Polygon', 'MultiPolygon'):
        if not c:
            raise ErrorEntrada(f'{t} sin coordenadas')
        partes = partes_de(g)
        nuevas, extra = procesar_poligonal(partes, n)
        if nuevas is None:
            info['original_con_problemas'] = extra
            return g
        info['partes'] += len(partes)
        info['conservadas'] += extra
        return {**g, 'coordinates': nuevas[0] if t == 'Polygon' else nuevas}
    if t == 'Point':
        return {**g, 'coordinates': redondear(c, n)}
    if t == 'MultiPoint':
        return {**g, 'coordinates': [redondear(p, n) for p in c]}
    if t in ('LineString', 'MultiLineString'):
        if not c:
            raise ErrorEntrada(f'{t} sin coordenadas')
        lineas = [c] if t == 'LineString' else c
        nuevas = []
        for l in lineas:
            q = redondear_linea(l, n)
            nuevas.append(q if len(q) >= 2 else l)
        return {**g, 'coordinates': nuevas[0] if t == 'LineString' else nuevas}
    if t == 'GeometryCollection':
        return {**g, 'geometries': [procesar_geometria(x, n, info) for x in g.get('geometries', [])]}
    raise ErrorEntrada(f'tipo de geometría no admitido: {t!r}')


def vertices(g):
    if g is None:
        return 0
    if g.get('type') == 'GeometryCollection':
        return sum(vertices(x) for x in g.get('geometries', []))

    def contar(c):
        if not c:
            return 0
        return 1 if isinstance(c[0], (int, float)) else sum(contar(x) for x in c)
    return contar(g.get('coordinates'))


def procesar_archivo(ruta, n):
    original = open(ruta, 'rb').read()
    datos = json.loads(original)
    if menciona_prohibido(os.path.relpath(ruta, RAIZ)) or menciona_prohibido(datos.get('name', '')) or any(
            menciona_prohibido(f.get('properties')) for f in datos.get('features', [])):
        raise ErrorEntrada(f'{ruta}: menciona pueblos en aislamiento voluntario; no se procesa (AGENTS.md).')
    info = {'partes': 0, 'conservadas': 0, 'original_con_problemas': None}
    nuevas = []
    for k, f in enumerate(datos.get('features', []), 1):
        try:
            g = procesar_geometria(f.get('geometry'), n, info)
        except ErrorEntrada as e:
            raise ErrorEntrada(f'{ruta}: entidad {k}: {e}')
        nuevas.append({**f, 'geometry': g})
    if info['original_con_problemas']:
        salida = original
    else:
        salida = json.dumps({**datos, 'features': nuevas}, ensure_ascii=False, separators=(',', ':')).encode('utf-8') + b'\n'
    return {'ruta': os.path.relpath(ruta, RAIZ), 'original': original, 'salida': salida, **info}


# ---------- interfaz ----------

def kb(b):
    return f'{len(b) / 1024:,.0f} KB'.replace(',', '.')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('archivos', nargs='*')
    ap.add_argument('--decimales', type=int, default=6)
    ap.add_argument('--comprobar', action='store_true', help='no escribe; termina con error si algún archivo cambiaría')
    args = ap.parse_args()
    if args.decimales < 6:
        raise SystemExit('Menos de 6 decimales mueve vértices más de 0,5 m; requiere aprobación de la entidad responsable.')

    autorizadas = capas_autorizadas()
    if not autorizadas:
        raise SystemExit(f'El catálogo no declara capas con estado {ESTADO_AUTORIZADO}.')
    if args.archivos:
        rutas = [os.path.realpath(a) for a in args.archivos]
        ajenas = [a for a, r in zip(args.archivos, rutas) if r not in autorizadas]
        if ajenas:
            raise SystemExit('No autorizadas en el catálogo (no se procesa nada): ' + ', '.join(ajenas))
    else:
        rutas = autorizadas
    faltan = [os.path.relpath(r, RAIZ) for r in rutas if not os.path.isfile(r)]
    if faltan:
        raise SystemExit('Faltan capas autorizadas en el catálogo: ' + ', '.join(faltan))

    try:
        resultados = [procesar_archivo(r, args.decimales) for r in rutas]
    except ErrorEntrada as e:
        raise SystemExit(f'Abortado sin escribir nada: {e}')

    cambiarian = 0
    t = [0, 0, 0, 0]
    print(f'{"archivo":44} {"antes":>9} {"después":>9} {"gzip antes":>10} {"gzip desp.":>10} {"polígonos":>9} {"sin redondear":>13}')
    for x in resultados:
        ga, gd = gzip.compress(x['original'], 6), gzip.compress(x['salida'], 6)
        for i, v in enumerate((len(x['original']), len(x['salida']), len(ga), len(gd))):
            t[i] += v
        nota = f'  ORIGINAL CON PROBLEMAS, sin cambios: {x["original_con_problemas"]}' if x['original_con_problemas'] else ''
        print(f'{x["ruta"].replace("datos/determinantes_ambientales/", ""):44} {kb(x["original"]):>9} {kb(x["salida"]):>9} '
              f'{kb(ga):>10} {kb(gd):>10} {x["partes"]:>9} {x["conservadas"]:>13}{nota}')
        if x['original'] != x['salida']:
            cambiarian += 1
            if not args.comprobar:
                with open(os.path.join(RAIZ, x['ruta']), 'wb') as fh:
                    fh.write(x['salida'])
    mb = [v / 1048576 for v in t]
    print(f'{"TOTAL":44} {mb[0]:>6.1f} MB {mb[1]:>6.1f} MB {mb[2]:>7.1f} MB {mb[3]:>7.1f} MB')
    print(f'Corrimiento máximo por redondeo: {0.5 * 10 ** -args.decimales * M_POR_GRADO * 2 ** .5:.2f} m.')
    if args.comprobar and cambiarian:
        raise SystemExit(f'{cambiarian} archivo(s) no están procesados. Ejecuta: python3 scripts/reducir_precision_geojson.py')
    print(f'{len(resultados)} archivo(s) revisados; {cambiarian} {"cambiarían" if args.comprobar else "actualizados"}.')


if __name__ == '__main__':
    main()
