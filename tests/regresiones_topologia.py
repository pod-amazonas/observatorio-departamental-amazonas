#!/usr/bin/env python3
"""Regresiones sintéticas del validador y del redondeo (sin datos reales).

El resultado esperado de cada caso es el de GEOS (Shapely `is_valid`), confirmado en la
revisión de Codex del PR #26. Se ejecuta desde tests/site.spec.js.
"""
import json
import os
import sys
import tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'scripts'))
from topologia_geojson import Problema, analizar, cargar_json  # noqa: E402
import reducir_precision_geojson as R  # noqa: E402

fallos = []


def valido(partes):
    return not analizar(partes)[0]


def esperar(nombre, obtenido, esperado):
    if obtenido != esperado:
        fallos.append(f'{nombre}: se esperaba {esperado}, se obtuvo {obtenido}')


CUADRADO = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]

# --- validez frente a GEOS ---
esperar('hueco con un contacto (GEOS válido)',
        valido([[CUADRADO, [[0, 5], [3, 3], [3, 7], [0, 5]]]]), True)
esperar('hueco con dos contactos que parte el interior (GEOS inválido)',
        valido([[CUADRADO, [[0, 5], [5, 2], [10, 5], [5, 8], [0, 5]]]]), False)
esperar('cadena de dos huecos que une dos puntos del exterior (GEOS inválido)',
        valido([[CUADRADO, [[0, 5], [2.5, 3], [5, 5], [2.5, 7], [0, 5]],
                 [[5, 5], [7.5, 3], [10, 5], [7.5, 7], [5, 5]]]]), False)
esperar('hueco parcialmente exterior por vértices del exterior (GEOS inválido)',
        valido([[[[0, 0], [10, 0], [10, 10], [0, 10], [0, 6], [0, 4], [0, 0]],
                 [[0, 4], [-2, 5], [0, 6], [3, 5], [0, 4]]]]), False)
esperar('tres anillos con un punto común (GEOS válido)',
        valido([[CUADRADO, [[5, 5], [3, 2], [7, 2], [5, 5]], [[5, 5], [7, 8], [3, 8], [5, 5]]]]), True)
esperar('parte dentro del hueco de otra (GEOS válido)',
        valido([[CUADRADO, [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]]],
                [[[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]]]), True)
esperar('parte que entra en otra por dos vértices (GEOS inválido)',
        valido([[[[0, 0], [10, 0], [10, 10], [0, 10], [0, 6], [0, 4], [0, 0]]],
                [[[0, 4], [-2, 5], [0, 6], [3, 5], [0, 4]]]]), False)
esperar('vértice consecutivo repetido (GEOS válido)',
        valido([[[[0, 0], [10, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]]), True)
esperar('lazo (GEOS inválido)', valido([[[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]]]), False)

# --- contraejemplo de Codex: el redondeo no debe desconectar el interior ---
u = 2 ** -20
anillos = [[(-.25, .25), (10.25, 1.75), (10.25, 10), (-.25, 10), (-.25, .25)],
           [(4.125, .875), (5, 1.125), (4.25, 3), (4.125, .875)],
           [(4.125, .875), (.125, .375), (1, 3), (4.125, .875)]]
g = {'type': 'Polygon', 'coordinates': [[[x * u, y * u] for x, y in r] for r in anillos]}
esperar('contraejemplo: original válido', valido([g['coordinates']]), True)
info = {'partes': 0, 'conservadas': 0, 'original_con_problemas': None}
salida = R.procesar_geometria(g, 6, info)
esperar('contraejemplo: salida válida', valido([salida['coordinates']]), True)
esperar('contraejemplo: polígono conservado sin redondear', salida['coordinates'] == g['coordinates'], True)

# --- valores no finitos ---
for texto in ('[NaN, 0]', '[Infinity, 0]', '[-Infinity, 0]'):
    try:
        cargar_json(texto)
        fallos.append(f'cargar_json aceptó {texto}')
    except Problema:
        pass
for p in ([float('nan'), 0], [float('inf'), 0]):
    try:
        R.procesar_geometria({'type': 'Point', 'coordinates': p}, 6, dict(info))
        fallos.append(f'procesar_geometria aceptó {p}')
    except R.ErrorEntrada:
        pass
with tempfile.TemporaryDirectory() as d:
    ruta = os.path.join(d, 'x.geojson')
    open(ruta, 'w').write('{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},'
                          '"geometry":{"type":"Point","coordinates":[NaN,0]}}]}')
    try:
        R.procesar_archivo(ruta, 6)
        fallos.append('procesar_archivo aceptó NaN')
    except R.ErrorEntrada:
        pass

for f in fallos:
    print('FALLO:', f)
print(f'{len(fallos)} fallo(s).')
sys.exit(1 if fallos else 0)
