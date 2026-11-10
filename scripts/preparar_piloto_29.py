#!/usr/bin/env python3
"""Entrega fiel del piloto #29. No instala herramientas, simplifica ni repara.

GDAL y GEOS se cargan únicamente al preparar. --comprobar usa la biblioteca
estándar, por lo que CI puede verificar la entrega sin acceder al original.
"""
import argparse
import ctypes as C
import datetime
import gzip
import hashlib
import json
import math
import os
import platform
import zlib
from pathlib import Path
import sys
import unicodedata

CONFIG = {
 'division_politico_administrativa': {
  'origen':'Division_Politico_Administrativa','categoria':'01_base_cartografica','entidades':11,'fuente':'IGAC','anio_encargo':2022,
  'campos':{'MpCodigo':'Código territorial conservado como texto, incluidos ceros iniciales.','MpNombre':'Nombre de la unidad territorial en la fuente.','MpNorma':'Referencia normativa literal; no acredita vigencia actual.','MpCategor':'Código de categoría; el catálogo de códigos no fue suministrado.','Restriccion':'Advertencia de uso de la cartografía, conservada literalmente.','Depto':'Departamento indicado en la fuente.'}},
 'cuencas_hidrograficas': {
  'origen':'Cuencas_Hidrograficas','categoria':'02_componente_biofisico','entidades':202,'fuente':'IDEAM','anio_encargo':2022,
  'campos':{'COD_AH':'Código AH de la fuente.','COD_ZH':'Código ZH de la fuente.','COD_SZH':'Código SZH de la fuente.','NOM_AH':'Nombre AH de la fuente.','NOM_ZH':'Nombre ZH de la fuente.','NOM_SZH':'Nombre SZH de la fuente.'}},
 'sistema_nacional_de_areas_protegidas': {
  'origen':'Sistema_Nacional_de_Areas_Protegidas','categoria':'02_componente_biofisico','entidades':5,'fuente':'RUNAP','anio_encargo':2021,
  'campos':{'nombre':'Nombre literal del registro; puede representar un fragmento de un parque.','id_pnn':'Identificador del parque en la fuente; no se supone único por fragmento.','categoria':'Categoría declarada por la fuente.','territoria':'Valor del campo territorial de la fuente, sin normalizar.','resolucion':'Referencia literal de resolución.','hectareas_':'Valor original del atributo denominado hectareas_; no recalculado ni certificado.','organizaci':'Organización indicada en la fuente.','fecha_regi':'Fecha de registro de la entidad, como texto original; no equivale a fecha de publicación o vigencia.'}}
}
LIMIT = 1_000_000  # Meta de transferencia del encargo; se mide gzip nivel 6.
REPO = Path(__file__).resolve().parents[1]


def load(path):
 def invalid(value):
  raise ValueError('Constante no JSON: '+value)
 return json.loads(Path(path).read_text(encoding='utf-8'), parse_constant=invalid)


def write(path, obj):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(obj,ensure_ascii=False,allow_nan=False,indent=2)+'\n',encoding='utf-8')


def digest(data):
 return hashlib.sha256(data).hexdigest()


def signed_area(ring):
 """Signo exacto sobre los doubles, sin cuantización ni aproximar áreas."""
 rr=[(x.as_integer_ratio(),y.as_integer_ratio()) for x,y in ring]
 denominator=max(max(x[1],y[1]) for x,y in rr)
 pts=[(x[0]*(denominator//x[1]),y[0]*(denominator//y[1])) for x,y in rr]
 return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(pts,pts[1:]))


def geometry_info(geometry, orient=False):
 if geometry.get('type')!='MultiPolygon' or not geometry.get('coordinates'):
  raise ValueError('Se requiere MultiPolygon no vacío; no se ocultan cambios de tipo.')
 counts={'poligonos':0,'anillos':0,'posiciones':0};reversed_count=0
 for polygon in geometry['coordinates']:
  if not polygon:raise ValueError('Polígono vacío')
  counts['poligonos']+=1
  for i,ring in enumerate(polygon):
   if len(ring)<4 or ring[0]!=ring[-1]:raise ValueError('Anillo abierto o insuficiente')
   for point in ring:
    if len(point)!=2 or not all(isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) for v in point):raise ValueError('Posición XY no finita')
    if not (-180<=point[0]<=180 and -90<=point[1]<=90):raise ValueError('Coordenadas fuera de CRS84')
   sign=signed_area(ring)
   if sign==0:raise ValueError('Anillo de área cero')
   if (sign>0)!=(i==0):
    if not orient:raise ValueError('Orientación no conforme a RFC 7946')
    ring.reverse();reversed_count+=1
   counts['anillos']+=1;counts['posiciones']+=len(ring)
 return counts,reversed_count


class GIS:
 def __init__(self,gdal,geos):
  self.g=C.CDLL(gdal);self.e=C.CDLL(geos)
  P,S,I,D=C.c_void_p,C.c_char_p,C.c_int,C.c_double
  defs=[('GDALAllRegister',None,[]),('GDALVersionInfo',S,[S]),('GDALOpenEx',P,[S,I,P,P,P]),('GDALClose',None,[P]),('GDALDatasetGetLayerByName',P,[P,S]),('OGR_L_GetSpatialRef',P,[P]),('OGR_L_GetNextFeature',P,[P]),('OGR_F_GetFID',C.c_longlong,[P]),('OGR_F_GetDefnRef',P,[P]),('OGR_FD_GetFieldCount',I,[P]),('OGR_FD_GetFieldDefn',P,[P,I]),('OGR_Fld_GetNameRef',S,[P]),('OGR_Fld_GetType',I,[P]),('OGR_GetFieldTypeName',S,[I]),('OGR_F_IsFieldSetAndNotNull',I,[P,I]),('OGR_F_GetFieldAsInteger64',C.c_longlong,[P,I]),('OGR_F_GetFieldAsDouble',D,[P,I]),('OGR_F_GetFieldAsString',S,[P,I]),('OGR_F_GetGeometryRef',P,[P]),('OGR_F_Destroy',None,[P]),('OGR_G_Is3D',I,[P]),('OGR_G_IsMeasured',I,[P]),('OGR_G_IsEmpty',I,[P]),('OGR_G_WkbSize',I,[P]),('OGR_G_ExportToWkb',I,[P,I,P]),('OGR_G_CreateFromWkb',I,[P,P,C.POINTER(P),I]),('OGR_G_CreateGeometryFromJson',P,[S]),('OGR_G_ExportToJsonEx',P,[P,P]),('OGR_G_Transform',I,[P,P]),('OGR_G_DestroyGeometry',None,[P]),('OSRExportToWkt',I,[P,C.POINTER(P)]),('OSRNewSpatialReference',P,[S]),('OSRSetFromUserInput',I,[P,S]),('OSRSetAxisMappingStrategy',None,[P,I]),('OCTNewCoordinateTransformation',P,[P,P]),('OCTDestroyCoordinateTransformation',None,[P]),('OSRDestroySpatialReference',None,[P]),('VSIFree',None,[P])]
  defs2=[('initGEOS',None,[P,P]),('GEOSversion',S,[]),('GEOSWKBReader_create',P,[]),('GEOSWKBReader_read',P,[P,P,C.c_size_t]),('GEOSGeom_destroy',None,[P]),('GEOSisValid',C.c_byte,[P])]
  for lib,table in [(self.g,defs),(self.e,defs2)]:
   for name,result,args in table:
    f=getattr(lib,name);f.restype=result;f.argtypes=args
  self.g.GDALAllRegister();self.e.initGEOS(None,None)
  self.reader=self.e.GEOSWKBReader_create()
  self.options=(S*3)(b'COORDINATE_PRECISION=17',b'SIGNIFICANT_FIGURES=17',None)

 def wkb(self,geometry):
  buf=C.create_string_buffer(self.g.OGR_G_WkbSize(geometry))
  if self.g.OGR_G_ExportToWkb(geometry,1,buf)!=0:raise ValueError('Error al copiar WKB')
  return buf.raw

 def valid(self,geometry):
  b=self.wkb(geometry);p=self.e.GEOSWKBReader_read(self.reader,C.create_string_buffer(b),len(b))
  if not p:raise ValueError('GEOS no pudo leer la geometría')
  result=self.e.GEOSisValid(p)==1;self.e.GEOSGeom_destroy(p)
  return result

 def json(self,geometry):
  p=self.g.OGR_G_ExportToJsonEx(geometry,self.options)
  if not p:raise ValueError('Error al exportar geometría')
  result=json.loads(C.string_at(p));self.g.VSIFree(p);return result

 def copy_source(self,source,internal):
  """Abrir solo OpenFileGDB, en lectura, y únicamente las tres capas aprobadas."""
  drivers=(C.c_char_p*2)(b'OpenFileGDB',None)
  ds=self.g.GDALOpenEx(os.fsencode(source),4,drivers,None,None) # VECTOR, sin UPDATE.
  if not ds:raise ValueError('No se pudo abrir la fuente en lectura')
  try:
   for key,cfg in CONFIG.items():
    layer=self.g.GDALDatasetGetLayerByName(ds,cfg['origen'].encode())
    if not layer:raise ValueError('Falta capa autorizada: '+cfg['origen'])
    ptr=C.c_void_p();self.g.OSRExportToWkt(self.g.OGR_L_GetSpatialRef(layer),C.byref(ptr))
    if not ptr:raise ValueError('SRC ausente: '+key)
    wkt=C.string_at(ptr).decode();self.g.VSIFree(ptr)
    folder=internal/key;folder.mkdir(parents=True,exist_ok=True);(folder/'src.wkt').write_text(wkt)
    records=[];fields=[]
    while True:
     feature=self.g.OGR_L_GetNextFeature(layer)
     if not feature:break
     try:
      fid=self.g.OGR_F_GetFID(feature);definition=self.g.OGR_F_GetDefnRef(feature)
      if not fields:
       fields=[{'nombre':self.g.OGR_Fld_GetNameRef(self.g.OGR_FD_GetFieldDefn(definition,i)).decode(),'tipo':self.g.OGR_GetFieldTypeName(self.g.OGR_Fld_GetType(self.g.OGR_FD_GetFieldDefn(definition,i))).decode()} for i in range(self.g.OGR_FD_GetFieldCount(definition))]
       if not set(cfg['campos']).issubset({f['nombre'] for f in fields}):raise ValueError('Esquema inesperado: '+key)
      values={}
      for i,field in enumerate(fields):
       if not self.g.OGR_F_IsFieldSetAndNotNull(feature,i):v=None
       elif field['tipo'] in ['Integer','Integer64']:v=self.g.OGR_F_GetFieldAsInteger64(feature,i)
       elif field['tipo']=='Real':v=self.g.OGR_F_GetFieldAsDouble(feature,i)
       else:v=self.g.OGR_F_GetFieldAsString(feature,i).decode()
       values[field['nombre']]=v
      normalized=unicodedata.normalize('NFKD',json.dumps(values,ensure_ascii=False,allow_nan=False)).encode('ascii','ignore').decode().lower()
      if any(term in normalized for term in ['aislamiento','aislados','piav']):raise ValueError('Revisión de sensibilidad necesaria: '+key)
      geom=self.g.OGR_F_GetGeometryRef(feature)
      if not geom or self.g.OGR_G_IsEmpty(geom) or self.g.OGR_G_Is3D(geom) or self.g.OGR_G_IsMeasured(geom) or not self.valid(geom):raise ValueError('Geometría nula, vacía, Z/M o inválida: '+key)
      b=self.wkb(geom);(folder/(str(fid)+'.wkb')).write_bytes(b)
      records.append({'id':fid,'properties':values,'sha256_wkb':digest(b)})
     finally:self.g.OGR_F_Destroy(feature)
    if len(records)!=cfg['entidades'] or len({r['id'] for r in records})!=len(records):raise ValueError('Conteo o identificadores inesperados: '+key)
    write(folder/'atributos.json',records);write(folder/'esquema.json',fields)
   # Los valores completos permanecen exclusivamente en el destino interno.
  finally:self.g.GDALClose(ds)

 def export(self,internal,out,version):
  catalog=[];dictionary={};quality={}
  destination=self.g.OSRNewSpatialReference(None)
  if self.g.OSRSetFromUserInput(destination,b'OGC:CRS84')!=0:raise ValueError('No se pudo crear CRS84')
  self.g.OSRSetAxisMappingStrategy(destination,0)
  for key,cfg in CONFIG.items():
   native=internal/key;wkt=(native/'src.wkt').read_text()
   src=self.g.OSRNewSpatialReference(wkt.encode());self.g.OSRSetAxisMappingStrategy(src,0)
   forward=self.g.OCTNewCoordinateTransformation(src,destination);backward=self.g.OCTNewCoordinateTransformation(destination,src)
   if not forward or not backward:raise ValueError('Transformación no disponible: '+key)
   rows=load(native/'atributos.json');features=[];totals={'poligonos':0,'anillos':0,'posiciones':0};max_error=0.;reoriented=0
   for row in rows:
    raw=(native/(str(row['id'])+'.wkb')).read_bytes()
    if digest(raw)!=row['sha256_wkb']:raise ValueError('Copia técnica modificada')
    geom=C.c_void_p()
    if self.g.OGR_G_CreateFromWkb(C.create_string_buffer(raw),src,C.byref(geom),len(raw))!=0:raise ValueError('WKB inválido')
    original=self.json(geom)
    if self.g.OGR_G_Transform(geom,forward)!=0:raise ValueError('Error de reproyección')
    converted=self.json(geom);self.g.OGR_G_DestroyGeometry(geom)
    counts,flips=geometry_info(converted,orient=True);reoriented+=flips
    for k,v in counts.items():totals[k]+=v
    check=self.g.OGR_G_CreateGeometryFromJson(json.dumps(converted).encode())
    if not check or not self.valid(check):raise ValueError('Geometría inválida tras exportar: '+key)
    if self.g.OGR_G_Transform(check,backward)!=0:raise ValueError('Error en control inverso')
    inverse=self.json(check);self.g.OGR_G_DestroyGeometry(check)
    if len(original['coordinates'])!=len(inverse['coordinates']):raise ValueError('Cambió el número de polígonos')
    for a,b in zip(original['coordinates'],inverse['coordinates']):
     if len(a)!=len(b):raise ValueError('Cambió el número de anillos')
     for r,s in zip(a,b):
      if len(r)!=len(s):raise ValueError('Cambió el número de posiciones')
      error=min(max(math.hypot(p[0]-q[0],p[1]-q[1]) for p,q in zip(r,t)) for t in [s,list(reversed(s))])
      max_error=max(max_error,error)
    features.append({'type':'Feature','id':row['id'],'properties':{f:row['properties'][f] for f in cfg['campos']},'geometry':converted})
   if max_error>0.00001:raise ValueError('Residuo inverso >0,00001 unidades nativas: '+key)
   data=(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
   relative=Path('capas')/cfg['categoria']/(key+'_v'+version+'.geojson');path=out/relative;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
   wkt_relative=Path('metadatos')/('src_'+digest(wkt.encode())[:12]+'.wkt');(out/wkt_relative).parent.mkdir(exist_ok=True);(out/wkt_relative).write_text(wkt)
   compressed=len(gzip.compress(data,compresslevel=6,mtime=0))
   catalog.append({'id_capa':key,'nombre_origen':cfg['origen'],'ruta_relativa':relative.as_posix(),'fuente_declarada_encargo':cfg['fuente'],'anio_declarado_encargo':cfg['anio_encargo'],'sha256_preparador':digest(Path(__file__).read_bytes()),'sha256_geometrias_origen':digest(''.join(str(r['id'])+':'+r['sha256_wkb']+'\n' for r in rows).encode()),'fecha_preparacion':datetime.datetime.strptime(version,'%Y%m%d').date().isoformat(),'nombre_publico':{'division_politico_administrativa':'División político-administrativa','cuencas_hidrograficas':'Cuencas hidrográficas — fuente multirregional','sistema_nacional_de_areas_protegidas':'Áreas protegidas — registros de la fuente'}[key],'prioridad':'piloto_aprobado_29','fecha_dato':None,'escala_resolucion':None,'licencia_autorizacion':'Preparación autorizada para revisión; licencia específica y publicación institucional final no acreditadas en los metadatos recibidos.','restricciones':{'division_politico_administrativa':'No utilizar para ubicación exacta ni cálculo de áreas/distancias; ver Restriccion literal.','cuencas_hidrograficas':'Incluye regiones fuera de Amazonas; no son rondas hídricas.','sistema_nacional_de_areas_protegidas':'Cinco registros, no cinco parques distintos; escala no acreditada.'}[key],'resultado_validacion':'GEOS y equivalencia verificados; revisar peso; sin certificación normativa.','observaciones':'Sin generalización adoptada ni integración pública al menú.','geometria':'MultiPolygon','entidades':len(features),'campos_publicos':list(cfg['campos']),'src_origen':wkt_relative.as_posix(),'src_salida':'OGC:CRS84 / RFC 7946','transformacion':'GDAL/PROJ desde el WKT declarado a OGC:CRS84; ejes GIS; sin época temporal acreditada. No reasignación de SRC.','gdal':self.g.GDALVersionInfo(b'RELEASE_NAME').decode(),'geos':self.e.GEOSversion().decode(),'proj':dict(line.split('=',1) for line in self.g.GDALVersionInfo(b'BUILD_INFO').decode().splitlines() if line.startswith('PROJ_')),'proj_network':'OFF','bytes':len(data),'bytes_gzip_6':compressed,'compresion':{'formato':'gzip','nivel':6,'mtime':0,'python':platform.python_version(),'zlib':zlib.ZLIB_RUNTIME_VERSION},'sha256':digest(data),'limite_transferencia_bytes':LIMIT,'cumple_meta_transferencia':compressed<=LIMIT,'simplificacion':False,'reduccion_precision':False,'estado':'preparado_para_revision_peso_pendiente' if compressed>LIMIT else 'preparado_para_revision','advertencia':'Prototipo; fuente y año declarados en el encargo, no acreditan vigencia ni publicación institucional.'})
   dictionary[key]={'id':{'origen':'FID/OBJECTID de origen','tipo_json':'integer','descripcion':'Conservado para esta entrega; persistencia entre ediciones de la fuente no acreditada.'},'campos':[{'origen':f['nombre'],'salida':f['nombre'] if f['nombre'] in cfg['campos'] else None,'tipo_origen':f['tipo'],'tipo_json':('number' if f['tipo'] in ['Integer','Integer64','Real'] else 'string')+' o null','publico':f['nombre'] in cfg['campos'],'descripcion':cfg['campos'].get(f['nombre'],'Excluido de la consulta del piloto; preservado en copia interna, sin valores en esta entrega.')} for f in load(native/'esquema.json')]}
   quality[key]={'entidades':len(features),**totals,'geometrias_validas_origen_y_salida':True,'atributos_publicos_conservados':True,'dimensiones_origen':'XY','poligonos_anillos_posiciones_conservados':True,'anillos_reorientados_rfc7946':reoriented,'residuo_max_transformacion_inversa_unidades_nativas':max_error,'nota':'Residuo numérico de ida/vuelta, no exactitud geográfica en terreno.'}
   for ct in [forward,backward]:self.g.OCTDestroyCoordinateTransformation(ct)
   self.g.OSRDestroySpatialReference(src)
   print(key+': '+str(len(data))+' bytes; gzip6 '+str(compressed)+' bytes')
  self.g.OSRDestroySpatialReference(destination)
  write(out/'catalogo_entrega.json',catalog);write(out/'diccionario_campos.json',dictionary);write(out/'validacion.json',quality)


def public_files(out):
 catalog=load(out/'catalogo_entrega.json')
 allowed={'catalogo_entrega.json','diccionario_campos.json','validacion.json','LEEME.md','SHA256SUMS'}
 allowed.update(row['ruta_relativa'] for row in catalog)
 allowed.update(row['src_origen'] for row in catalog)
 files=sorted(p for p in out.rglob('*') if p.is_file() and p.name!='.DS_Store')
 if any(p.relative_to(out).as_posix() not in allowed for p in files):raise ValueError('Archivo ajeno al paquete público; no se añade al manifiesto')
 return [p for p in files if p.name!='SHA256SUMS']


def checksum_file(out):
 files=public_files(out)
 (out/'SHA256SUMS').write_text(''.join(digest(p.read_bytes())+'  '+p.relative_to(out).as_posix()+'\n' for p in files))


def check(out,require_budget=False):
 catalog=load(out/'catalogo_entrega.json');dictionary=load(out/'diccionario_campos.json');quality=load(out/'validacion.json')
 if {r['id_capa'] for r in catalog}!=set(CONFIG):raise ValueError('Conjunto de capas incompleto o ajeno al piloto')
 expected={}
 for line in (out/'SHA256SUMS').read_text().splitlines():
  sha,name=line.split('  ',1);p=(out/name).resolve()
  if not p.is_relative_to(out.resolve()):raise ValueError('Ruta no autorizada en manifiesto')
  if name in expected:raise ValueError('Entrada duplicada en manifiesto')
  if not p.is_file() or digest(p.read_bytes())!=sha:raise ValueError('Huellas incorrectas: '+name)
  expected[name]=sha
 actual={p.relative_to(out).as_posix() for p in public_files(out)}
 if set(expected)!=actual:raise ValueError('El manifiesto no cubre exactamente la entrega')
 over=[]
 for row in catalog:
  cfg=CONFIG[row['id_capa']];target=(out/row['ruta_relativa']).resolve()
  if not target.is_relative_to(out.resolve()) or target.suffix!='.geojson' or not target.name.startswith(row['id_capa']+'_v'):raise ValueError('Ruta GeoJSON no autorizada')
  if row['limite_transferencia_bytes']!=LIMIT or row['simplificacion'] is not False or row['reduccion_precision'] is not False:raise ValueError('No es una entrega fiel o meta incorrecta')
  data=target.read_bytes();obj=load(target)
  if obj.get('type')!='FeatureCollection' or 'crs' in obj or set(obj)!= {'type','features'}:raise ValueError('FeatureCollection no conforme')
  if len(obj['features'])!=cfg['entidades'] or row['entidades']!=cfg['entidades']:raise ValueError('Conteo incorrecto')
  ids=[];totals={'poligonos':0,'anillos':0,'posiciones':0}
  for f in obj['features']:
   if f.get('type')!='Feature' or (not isinstance(f.get('id'),int) or isinstance(f.get('id'),bool)) or set(f['properties'])!=set(cfg['campos']):raise ValueError('ID/esquema público incorrecto')
   ids.append(f['id']);counts,_=geometry_info(f['geometry'])
   for k,v in counts.items():totals[k]+=v
  if len(set(ids))!=len(ids):raise ValueError('ID duplicado')
  if any(quality[row['id_capa']][k]!=v for k,v in totals.items()):raise ValueError('Conteos de geometría incoherentes')
  size=len(gzip.compress(data,compresslevel=6,mtime=0))
  if len(data)!=row['bytes'] or digest(data)!=row['sha256'] or row['sha256_preparador']!=digest(Path(__file__).read_bytes()):raise ValueError('Tamaños/huellas o preparador incorrectos')
  measured=row['compresion']
  if measured['formato']!='gzip' or measured['nivel']!=6 or measured['mtime']!=0:raise ValueError('Compresión no documentada')
  same_codec=measured['python']==platform.python_version() and measured['zlib']==zlib.ZLIB_RUNTIME_VERSION
  if same_codec and size!=row['bytes_gzip_6']:raise ValueError('Tamaño gzip incorrecto para el entorno documentado')
  if row['cumple_meta_transferencia']!=(row['bytes_gzip_6']<=LIMIT) or row['cumple_meta_transferencia']!=(size<=LIMIT):raise ValueError('La medición gzip actual o registrada contradice el estado de peso')
  if not same_codec:print(row['id_capa']+': gzip6 en este entorno '+str(size)+' bytes; medición registrada '+str(row['bytes_gzip_6'])+' bytes (versiones distintas de compresor).')
  if {f['origen'] for f in dictionary[row['id_capa']]['campos'] if f['publico']}!=set(cfg['campos']):raise ValueError('Diccionario público incorrecto')
  if size>LIMIT:over.append(row['id_capa'])
 print('3 capas verificadas; '+str(len(over))+' superan la meta de transferencia de 1 MB.')
 return 2 if require_budget and over else 0


def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--salida',type=Path,required=True);p.add_argument('--comprobar',action='store_true');p.add_argument('--exigir-meta',action='store_true')
 p.add_argument('--geodatabase',type=Path);p.add_argument('--interno',type=Path);p.add_argument('--gdal-library');p.add_argument('--geos-library');p.add_argument('--gdal-data');p.add_argument('--proj-data');p.add_argument('--version',default='20261110')
 args=p.parse_args();out=args.salida.resolve()
 if args.comprobar:return check(out,args.exigir_meta)
 if not all([args.geodatabase,args.interno,args.gdal_library,args.geos_library]):p.error('Preparar requiere --geodatabase, --interno, --gdal-library y --geos-library; no se instala software.')
 source=args.geodatabase.resolve();internal=args.interno.resolve()
 if not source.is_dir() or source.suffix.lower()!='.gdb':raise ValueError('Se requiere una geodatabase local .gdb')
 if internal.is_relative_to(REPO) or out.is_relative_to(source) or internal.is_relative_to(source) or out==internal or out.is_relative_to(internal) or internal.is_relative_to(out):raise ValueError('Destinos internos/públicos separados y fuera del original; custodia interna fuera del repositorio.')
 for key,value in [('GDAL_DATA',args.gdal_data),('PROJ_DATA',args.proj_data)]:
  if value:os.environ[key]=value
 datetime.datetime.strptime(args.version,'%Y%m%d')
 os.environ['PROJ_NETWORK']='OFF'
 gis=GIS(args.gdal_library,args.geos_library);internal.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
 gis.copy_source(source,internal);gis.export(internal,out,args.version);checksum_file(out)
 return check(out,args.exigir_meta)


if __name__=='__main__':
 try:sys.exit(main())
 except (ValueError,OSError,KeyError,TypeError) as exc:
  print('Error de preparación/verificación: '+str(exc),file=sys.stderr);sys.exit(1)
