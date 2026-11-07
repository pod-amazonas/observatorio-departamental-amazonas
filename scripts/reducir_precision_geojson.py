#!/usr/bin/env python3
"""Reduce la precisión de las coordenadas de los GeoJSON publicados para la web.

Qué hace:
  - Redondea cada coordenada a N decimales (por defecto 6, unos 0,11 m en el Amazonas).
  - Quita vértices consecutivos que quedan repetidos tras redondear (no cambia la forma).
  - Escribe JSON compacto, sin espacios. No toca propiedades, nombres ni CRS.

Qué NO hace:
  - No simplifica geometrías ni elimina vértices distintos. Simplificar cambia la
    geometría y requiere el visto bueno de la entidad responsable (ver AGENTS.md).

Seguridad de datos:
  - Rechaza cualquier archivo relacionado con pueblos en aislamiento voluntario.
  - Si al redondear un anillo quedara con menos de 4 posiciones (o una línea con menos de 2),
    se conserva ese anillo con sus coordenadas originales: no se elimina ninguna figura.
    En los datos actuales son triángulos degenerados de menos de 1,4 m² heredados del SIG.

Uso:
  python3 scripts/reducir_precision_geojson.py            # procesa datos/determinantes_ambientales
  python3 scripts/reducir_precision_geojson.py --comprobar  # solo informa; falla si algo cambiaría
  python3 scripts/reducir_precision_geojson.py archivo.geojson ...
"""
import argparse
import glob
import gzip
import json
import math
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATRON = os.path.join(RAIZ, 'datos', 'determinantes_ambientales', '*', '*.geojson')
PROHIBIDO = ('aislamiento',)
M_POR_GRADO = 111_320  # metros por grado de latitud (aprox.)


class ErrorGeometria(Exception):
    pass


conservados = [0]  # anillos o líneas que se dejan con sus coordenadas originales


def redondear_posicion(p, n):
    return [round(v, n) for v in p]


def limpiar_linea(linea, n, minimo):
    salida = []
    for p in linea:
        q = redondear_posicion(p, n)
        if not salida or q != salida[-1]:
            salida.append(q)
    if len(salida) < minimo:
        conservados[0] += 1
        return linea
    return salida


def procesar_geometria(g, n):
    t = g.get('type')
    c = g.get('coordinates')
    if t == 'Point':
        return {**g, 'coordinates': redondear_posicion(c, n)}
    if t == 'MultiPoint':
        return {**g, 'coordinates': [redondear_posicion(p, n) for p in c]}
    if t == 'LineString':
        return {**g, 'coordinates': limpiar_linea(c, n, 2)}
    if t == 'MultiLineString':
        return {**g, 'coordinates': [limpiar_linea(l, n, 2) for l in c]}
    if t == 'Polygon':
        return {**g, 'coordinates': [limpiar_linea(r, n, 4) for r in c]}
    if t == 'MultiPolygon':
        return {**g, 'coordinates': [[limpiar_linea(r, n, 4) for r in pol] for pol in c]}
    if t == 'GeometryCollection':
        return {**g, 'geometries': [procesar_geometria(x, n) for x in g['geometries']]}
    raise ErrorGeometria(f'tipo de geometría no admitido: {t}')


def anillos(g):
    t, c = g.get('type'), g.get('coordinates')
    if t == 'Polygon':
        yield from c
    elif t == 'MultiPolygon':
        for pol in c:
            yield from pol
    elif t == 'GeometryCollection':
        for x in g['geometries']:
            yield from anillos(x)


def area_plana(g):
    """Suma de |área| de anillos (grados², solo para comparar antes y después)."""
    total = 0.0
    for r in anillos(g):
        s = 0.0
        for (x1, y1), (x2, y2) in zip(r, r[1:]):
            s += x1 * y2 - x2 * y1
        total += abs(s) / 2
    return total


def contar_vertices(g):
    if g is None:
        return 0
    if g.get('type') == 'GeometryCollection':
        return sum(contar_vertices(x) for x in g['geometries'])

    def contar(c):
        return 1 if isinstance(c[0], (int, float)) else sum(contar(x) for x in c)
    return contar(g['coordinates'])


def procesar_archivo(ruta, n):
    nombre = os.path.basename(ruta).lower()
    if any(p in ruta.lower() or p in nombre for p in PROHIBIDO):
        raise SystemExit(f'Rechazado: {ruta} parece relacionado con pueblos en aislamiento voluntario.')
    original = open(ruta, 'rb').read()
    datos = json.loads(original)
    if any(p in json.dumps(datos.get('name', '')).lower() for p in PROHIBIDO):
        raise SystemExit(f'Rechazado: {ruta} parece relacionado con pueblos en aislamiento voluntario.')
    conservados[0] = 0
    v_antes = v_despues = 0
    a_antes = a_despues = 0.0
    nuevas = []
    for f in datos['features']:
        g = f.get('geometry')
        ng = procesar_geometria(g, n) if g else g
        if g:
            v_antes += contar_vertices(g)
            v_despues += contar_vertices(ng)
            a_antes += area_plana(g)
            a_despues += area_plana(ng)
        nuevas.append({**f, 'geometry': ng})
    salida = json.dumps({**datos, 'features': nuevas}, ensure_ascii=False, separators=(',', ':')).encode('utf-8') + b'\n'
    return {
        'ruta': os.path.relpath(ruta, RAIZ),
        'original': original,
        'salida': salida,
        'vertices': (v_antes, v_despues),
        'cambio_area': abs(a_despues - a_antes) / a_antes if a_antes else 0.0,
        'conservados': conservados[0],
        'desplazamiento_max_m': 0.5 * 10 ** -n * M_POR_GRADO * math.sqrt(2),
    }


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
    rutas = args.archivos or sorted(glob.glob(PATRON))
    resultados = []
    try:
        for r in rutas:
            resultados.append(procesar_archivo(r, args.decimales))
    except ErrorGeometria as e:
        raise SystemExit(f'Abortado sin escribir nada: {e}')
    cambiarian = 0
    t_antes = t_despues = g_antes = g_despues = 0
    print(f'{"archivo":58} {"antes":>10} {"después":>10} {"gzip antes":>11} {"gzip desp.":>11} {"vért. quitados":>15} {"Δ área":>9} {"conservados":>12}')
    for x in resultados:
        ga, gd = gzip.compress(x['original'], 6), gzip.compress(x['salida'], 6)
        t_antes += len(x['original']); t_despues += len(x['salida']); g_antes += len(ga); g_despues += len(gd)
        va, vd = x['vertices']
        print(f'{x["ruta"]:58} {kb(x["original"]):>10} {kb(x["salida"]):>10} {kb(ga):>11} {kb(gd):>11} {va - vd:>15,} {x["cambio_area"]:>9.2e} {x["conservados"]:>12}')
        if x['original'] != x['salida']:
            cambiarian += 1
            if not args.comprobar:
                with open(os.path.join(RAIZ, x['ruta']), 'wb') as fh:
                    fh.write(x['salida'])
    print(f'{"TOTAL":58} {t_antes / 1048576:>8.1f} MB {t_despues / 1048576:>8.1f} MB {g_antes / 1048576:>9.1f} MB {g_despues / 1048576:>9.1f} MB')
    print(f'Desplazamiento máximo por redondeo: {resultados[0]["desplazamiento_max_m"]:.2f} m' if resultados else 'Sin archivos.')
    if args.comprobar and cambiarian:
        raise SystemExit(f'{cambiarian} archivo(s) tienen más de {args.decimales} decimales. Ejecuta el script sin --comprobar.')
    print(f'{cambiarian} archivo(s) {"cambiarían" if args.comprobar else "actualizados"}.')


if __name__ == '__main__':
    main()
