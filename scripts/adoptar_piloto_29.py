#!/usr/bin/env python3
"""Aplicar exclusivamente las decisiones de Alejandro del PR #31, 2026-11-10.

Lee copias; no abre ni modifica la geodatabase. La selección se hace con
GEOS Intersects en el SRC nativo, sobre la división original sin simplificar.
"""
import argparse
import ctypes as C
import gzip
import json
import os
import platform
import zlib
from pathlib import Path
from preparar_piloto_29 import GIS, CONFIG, REPO, digest, load, write, geometry_info, checksum_file, check

SOURCE_SHA = {
 'division_politico_administrativa':'30f92e6d130ecd16b62c345cb3a5d3ff6b29f2d58d4d2a22b806be347ed64bf8',
 'cuencas_hidrograficas':'57086cddf92c06cf7786ef4e1eb3460ce629c652574c1d5227960870e0629130',
 'sistema_nacional_de_areas_protegidas':'74d37815e0d7b692e8b88baadf7f6c5ac98bab0f752d5748d8ef429c9711ffb6'}
DIVISION_SHA='2c872bcc31316bc5ca485c3ca13ad8bf5133c67a918e00e56c940bcaddbe35d6'

def feature_sha(feature):
 return digest(json.dumps(feature,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode())

def check_adoption(out,report):
 if report['sha256_adoptador']!=digest(Path(__file__).read_bytes()):raise ValueError('Adoptador modificado; regenerar evidencia')
 catalog=load(out/'catalogo_entrega.json')
 if report['decision']!='Alejandro / PR #31 / 2026-11-10' or report['fuentes_autorizadas']!=['IGAC','IDEAM','RUNAP']:raise ValueError('Decisión no documentada')
 for row in catalog:
  key=row['id_capa'];r=report['capas'][key];data=(out/row['ruta_relativa']).read_bytes();obj=load(out/row['ruta_relativa'])
  if r['sha256_fiel_previo']!=SOURCE_SHA[key] or r['sha256_publicado']!=digest(data):raise ValueError('Referencia de adopción incorrecta')
  if row['estado']!='integrado_autorizado_31' or not row['autorizacion_publicacion'].startswith('Alejandro'):raise ValueError('Autorización ausente')
  if {str(f['id']):feature_sha(f) for f in obj['features']}!=r['huellas_entidades_publicadas']:raise ValueError('Entidad completa modificada')
  if key=='division_politico_administrativa':
   if digest(data)!=DIVISION_SHA or r['parametro_m']!=10 or r['algoritmo']!='GEOSCoverageSimplifyVW' or 'representación simplificada' not in row['nombre_publico']:raise ValueError('Solo se autorizó el candidato de División de 10 m')
  elif key=='cuencas_hidrograficas':
   if len(r['ids_interseccion_nativa'])!=19 or [f['id'] for f in obj['features']]!=r['ids_interseccion_nativa'] or r['huellas_entidades_publicadas']!=r['huellas_entidades_fieles_seleccionadas']:raise ValueError('Selección o geometría de cuencas alterada')
  elif digest(data)!=SOURCE_SHA[key]:raise ValueError('Áreas protegidas debe ser copia fiel exacta')

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for name in ['fiel','interno','division-10m','salida']:p.add_argument('--'+name,type=Path,required=True)
 p.add_argument('--gdal-library',required=True);p.add_argument('--geos-library',required=True)
 a=p.parse_args();fiel=a.fiel.resolve();internal=a.interno.resolve();out=a.salida.resolve()
 if fiel==out or fiel.is_relative_to(out) or internal.is_relative_to(REPO) or a.division_10m.resolve().is_relative_to(REPO):raise ValueError('Se requieren copias separadas fuera del repositorio')
 os.environ['PROJ_NETWORK']='OFF';gis=GIS(a.gdal_library,a.geos_library);e=gis.e;P=C.c_void_p
 for n,r,args in [('GEOSGeom_createCollection',P,[C.c_int,C.POINTER(P),C.c_uint]),('GEOSUnaryUnion',P,[P]),('GEOSPrepare',P,[P]),('GEOSPreparedIntersects',C.c_byte,[P,P]),('GEOSPreparedGeom_destroy',None,[P])]:
  f=getattr(e,n);f.restype=r;f.argtypes=args
 source_catalog={r['id_capa']:r for r in load(fiel/'catalogo_entrega.json')}
 def native(key):
  folder=internal/key;rows=load(folder/'atributos.json');result=[]
  signature=digest(''.join(str(r['id'])+':'+r['sha256_wkb']+'\n' for r in rows).encode())
  if signature!=source_catalog[key]['sha256_geometrias_origen'] or len(rows)!=CONFIG[key]['entidades']:raise ValueError('Copia nativa ajena a la entrega fiel')
  if (folder/'src.wkt').read_bytes()!=(fiel/source_catalog[key]['src_origen']).read_bytes():raise ValueError('SRC nativo distinto')
  for row in rows:
   b=(folder/(str(row['id'])+'.wkb')).read_bytes()
   if digest(b)!=row['sha256_wkb']:raise ValueError('Copia técnica alterada')
   geom=e.GEOSWKBReader_read(gis.reader,C.create_string_buffer(b),len(b))
   if not geom or e.GEOSisValid(geom)!=1:raise ValueError('Geometría de origen inválida')
   result.append((row,geom))
  return result
 division=native('division_politico_administrativa');arr=(P*len(division))(*(g for _,g in division))
 collection=e.GEOSGeom_createCollection(7,arr,len(division));region=e.GEOSUnaryUnion(collection);prepared=e.GEOSPrepare(region)
 if not prepared:raise ValueError('No se pudo construir límite original')
 selected=[];basin_rows=native('cuencas_hidrograficas')
 for row,geom in basin_rows:
  hit=e.GEOSPreparedIntersects(prepared,geom)
  if hit not in [0,1]:raise ValueError('Error al intersectar')
  if hit:selected.append(row['id'])
  e.GEOSGeom_destroy(geom)
 e.GEOSPreparedGeom_destroy(prepared);e.GEOSGeom_destroy(region);e.GEOSGeom_destroy(collection)
 if len(selected)!=19:raise ValueError('La selección no da las 19 cuencas revisadas')
 catalog=load(fiel/'catalogo_entrega.json');quality=load(fiel/'validacion.json');report={'decision':'Alejandro / PR #31 / 2026-11-10','fuentes_autorizadas':['IGAC','IDEAM','RUNAP'],'geos':e.GEOSversion().decode(),'sha256_adoptador':digest(Path(__file__).read_bytes()),'capas':{}}
 for row in catalog:
  key=row['id_capa'];raw=(fiel/row['ruta_relativa']).read_bytes()
  if digest(raw)!=SOURCE_SHA[key]:raise ValueError('La copia fiel no corresponde a la revisión inicial: '+key)
  obj=json.loads(raw);r={'sha256_fiel_previo':digest(raw)}
  if key=='division_politico_administrativa':
   raw=a.division_10m.read_bytes()
   if digest(raw)!=DIVISION_SHA:raise ValueError('El candidato no coincide con el ensayo de 10 m revisado')
   obj=json.loads(raw);r.update(parametro_m=10,algoritmo='GEOSCoverageSimplifyVW',bordes_compartidos_conservados=True,hausdorff_discreta_m=9.173106455684275)
   row['nombre_publico']='División político-administrativa — representación simplificada'
   row['simplificacion']=True;row['restricciones']='Representación simplificada, parámetro 10 m; no usar para ubicación exacta, delimitación legal ni cálculo de áreas/distancias.'
   quality[key]['poligonos_anillos_posiciones_conservados']=False
   quality[key]['poligonos_y_anillos_conservados']=True
   quality[key]['residuo_max_transformacion_inversa_unidades_nativas']=None
   quality[key]['nota']='Representación simplificada autorizada; equivalencia por posiciones no aplica. Efectos medidos en docs/piloto_29/evaluacion_simplificacion.json.'
  elif key=='cuencas_hidrograficas':
   # Conserva el orden, cada entidad completa y todos sus atributos públicos.
   obj['features']=[f for f in obj['features'] if f['id'] in selected]
   if [f['id'] for f in obj['features']]!=selected:raise ValueError('Orden de copias nativas y fieles distinto')
   raw=(json.dumps(obj,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
   r.update(ids_interseccion_nativa=selected,metodo='GEOS Intersects en SRC nativo contra unión de las 11 unidades originales; incluye contactos de borde; sin recortar ni simplificar',huellas_entidades_fieles_seleccionadas={str(f['id']):feature_sha(f) for f in obj['features']})
   row['nombre_publico']='Cuencas que intersectan Amazonas — completas'
   row['restricciones']='19 cuencas completas que intersectan el departamento; se extienden fuera de él. No son rondas hídricas.'
  for f in obj['features']:
   g=gis.g.OGR_G_CreateGeometryFromJson(json.dumps(f['geometry']).encode())
   if not g or not gis.valid(g):raise ValueError('Geometría publicada inválida')
   gis.g.OGR_G_DestroyGeometry(g)
  totals={'poligonos':0,'anillos':0,'posiciones':0}
  for f in obj['features']:
   counts,_=geometry_info(f['geometry'])
   for k,v in counts.items():totals[k]+=v
  quality[key].update(entidades=len(obj['features']),**totals)
  row.update(entidades=len(obj['features']),bytes=len(raw),bytes_gzip_6=len(gzip.compress(raw,compresslevel=6,mtime=0)),sha256=digest(raw),sha256_preparador=digest((REPO/'scripts/preparar_piloto_29.py').read_bytes()),estado='integrado_autorizado_31',autorizacion_publicacion='Alejandro, decisión expresa PR #31, 2026-11-10: IGAC, IDEAM y RUNAP.',licencia_autorizacion='Publicación del piloto autorizada por Alejandro para las tres fuentes; no implica cambio de licencia, vigencia o aval oficial.',observaciones='Integración bajo demanda al menú. Excepción de peso aceptada para Cuencas y Áreas protegidas.',resultado_validacion='GEOS válido; controles de integridad y tratamiento autorizado verificados.',advertencia='Prototipo; fuente y año del encargo. Las cifras calculadas no son oficiales.')
  row['cumple_meta_transferencia']=row['bytes_gzip_6']<=row['limite_transferencia_bytes']
  row['compresion'].update(python=platform.python_version(),zlib=zlib.ZLIB_RUNTIME_VERSION)
  row['excepcion_peso_autorizada']=not row['cumple_meta_transferencia']
  path=out/row['ruta_relativa'];path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
  r.update(sha256_publicado=digest(raw),huellas_entidades_publicadas={str(f['id']):feature_sha(f) for f in obj['features']});report['capas'][key]=r
  print(key,len(obj['features']),len(raw),row['bytes_gzip_6'])
 write(out/'catalogo_entrega.json',catalog);write(out/'validacion.json',quality);write(out/'adopcion.json',report)
 checksum_file(out);return check(out)

if __name__=='__main__':
 try:raise SystemExit(main())
 except (ValueError,OSError,KeyError,TypeError) as exc:raise SystemExit('Error de adopción: '+str(exc))
