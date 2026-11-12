"""Opción B de #41: MakeValid LINEWORK solo para FID 484 y 2165, en copias.
Sin QGIS al importar; las comprobaciones combinatorias usan biblioteca estándar.
"""
import ctypes as C
from collections import Counter
from fractions import Fraction
from hashlib import sha256

AUTORIZADOS={484,2165}

def posiciones(geo):
 if geo['type']!='MultiPolygon':raise ValueError('La reparación requiere MultiPolygon; no se descartan partes colapsadas')
 return [tuple(p) for poly in geo['coordinates'] for ring in poly for p in ring]

def aristas(geo):
 return Counter(tuple(sorted((tuple(a),tuple(b)))) for poly in geo['coordinates'] for ring in poly for a,b in zip(ring,ring[1:]))

def area_exacta(geo):
 """Shoelace racional de doubles; exterior menos huecos, sin cancelación float.
 En una entrada inválida es área algebraica, no una superficie OGC certificada.
 """
 total=Fraction()
 for poly in geo['coordinates']:
  for i,ring in enumerate(poly):
   ratios=[(x.as_integer_ratio(),y.as_integer_ratio()) for x,y in ring]
   d=max(n for pair in ratios for _,n in pair)
   xy=[(x[0]*(d//x[1]),y[0]*(d//y[1])) for x,y in ratios]
   twice=abs(sum(x1*y2-x2*y1 for (x1,y1),(x2,y2) in zip(xy,xy[1:])))
   total+=(1 if i==0 else -1)*Fraction(twice,2*d*d)
 return total

def certificar(antes,despues):
 a,b=posiciones(antes),posiciones(despues);sa,sb=set(a),set(b)
 if sa!=sb:raise ValueError('MakeValid añadió, perdió o movió coordenadas: requiere decisión')
 if aristas(antes)!=aristas(despues):raise ValueError('MakeValid cambió segmentos: requiere decisión')
 aa,bb=area_exacta(antes),area_exacta(despues)
 if aa!=bb:raise ValueError('Cambió el área algebraica exacta: requiere decisión')
 return {'posiciones_antes':len(a),'posiciones_despues':len(b),'vertices_unicos_antes':len(sa),'vertices_unicos_despues':len(sb),
  'vertices_originales_ausentes':0,'coordenadas_nuevas':0,'segmentos_identicos_con_multiplicidad':True,'desplazamiento_max_vertices_m':0,
  'area_algebraica_original_m2':float(aa),'area_reparada_m2':float(bb),'diferencia_area_exacta_m2':float(bb-aa),
  'area_exacta_numerador':str(aa.numerator),'area_exacta_denominador':str(aa.denominator),
  'poligonos_antes':len(antes['coordinates']),'poligonos_despues':len(despues['coordinates']),
  'anillos_antes':sum(map(len,antes['coordinates'])),'anillos_despues':sum(map(len,despues['coordinates']))}

def reparar(q,geometry,fid):
 if fid not in AUTORIZADOS:raise ValueError('FID no autorizado para reparación')
 g=q.g;P,S=C.c_void_p,C.c_char_p
 for name,result,args in [('OGR_G_MakeValidEx',P,[P,C.POINTER(S)]),('OGR_G_Area',C.c_double,[P]),('OGRGetGEOSVersion',C.c_int,[C.POINTER(C.c_int)]*3)]:
  f=getattr(g,name);f.restype=result;f.argtypes=args
 version=[C.c_int() for _ in range(3)]
 if not g.OGRGetGEOSVersion(*(C.byref(v) for v in version)):raise ValueError('GDAL sin GEOS')
 if q.valid(geometry):raise ValueError('La geometría autorizada ya es válida; revisar cambio de fuente')
 before=q.wkb(geometry);antes=q.json(geometry)
 fixed=g.OGR_G_MakeValidEx(geometry,(S*2)(b'METHOD=LINEWORK',None))
 if not fixed:raise ValueError('Falló MakeValid')
 try:
  if not q.valid(fixed):raise ValueError('MakeValid no produjo geometría válida')
  metricas=certificar(antes,q.json(fixed))
  if q.wkb(geometry)!=before:raise ValueError('Se alteró la copia original de entrada')
  metricas.update({'fid':fid,'metodo':'OGR_G_MakeValidEx / GEOS MakeValid, METHOD=LINEWORK','geos_gdal':'.'.join(str(v.value) for v in version),
   'geos_control':q.e.GEOSversion().decode(),'valida_antes':False,'valida_despues':True,
   'sha256_wkb_antes':sha256(before).hexdigest(),'sha256_wkb_reparado':sha256(q.wkb(fixed)).hexdigest(),
   'area_gdal_original_m2':g.OGR_G_Area(geometry),'area_gdal_reparada_m2':g.OGR_G_Area(fixed),
   'nota_area':'Original inválido: área algebraica de anillos, no superficie OGC acreditada. Cálculo racional exacto sobre doubles en metros MAGNA CTM12. Diferencias GDAL float pueden ser redondeo numérico.'})
  return fixed,metricas
 except BaseException:
  g.OGR_G_DestroyGeometry(fixed);raise
