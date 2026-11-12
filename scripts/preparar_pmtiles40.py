#!/usr/bin/env python3
"""POC autorizada: Drenaje_Doble, 92 entidades válidas; dos reparaciones autorizadas en copias. Sin instalaciones.
--comprobar solo usa biblioteca estándar. Las copias técnicas quedan fuera del repo.
"""
import argparse,ctypes as C,gzip,hashlib,json,math,os,struct,sys,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'datos/teselas_40'
REPARADOS={484,2165}
CONTROL_90_SHA256='5943e53f913af6e98fa10941331b5c14154d4c2bead631673cf0ca4fc6f69d83'
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,obj):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,allow_nan=False,indent=2)+'\n',encoding='utf8')
def header(b):
 if b[:8]!=b'PMTiles\x03':raise ValueError('Cabecera PMTiles v3 ausente')
 names=['root_offset','root_bytes','metadata_offset','metadata_bytes','leaf_offset','leaf_bytes','tile_offset','tile_bytes','addressed_tiles','tile_entries','tile_contents']
 h=dict(zip(names,struct.unpack_from('<11Q',b,8)));h.update(zip(['clustered','internal_compression','tile_compression','tile_type','minzoom','maxzoom'],b[96:102]));return h

def escribir_catalogo(m):
 control=load(ROOT/'datos/tanda_1_29/capas/departamento_amazonas.geojson')['features'][0]['geometry']
 pts=[p for poly in control['coordinates'] for ring in poly for p in ring]
 m['departamento_bbox']=[min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)]
 write(OUT/'catalogo.json',m)
 actualizar_manifiesto()

def actualizar_manifiesto():
 files=sorted(p for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
 (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+p.relative_to(OUT).as_posix()+'\n' for p in files))


def comprobar():
 m=load(OUT/'catalogo.json');p=OUT/'drenaje_doble.pmtiles';b=p.read_bytes();h=header(b)
 if len(b)!=m['bytes'] or sha(b)!=m['sha256']:raise ValueError('Peso o SHA-256 distinto')
 if h['minzoom']!=5 or h['maxzoom']!=12 or h['tile_type']!=1 or h['tile_compression']!=2:raise ValueError('Zoom o formato inesperado')
 for off,size in [('root_offset','root_bytes'),('metadata_offset','metadata_bytes'),('leaf_offset','leaf_bytes'),('tile_offset','tile_bytes')]:
  if h[off]+h[size]>len(b):raise ValueError('Sección fuera del archivo')
 meta=b[h['metadata_offset']:h['metadata_offset']+h['metadata_bytes']]
 if h['internal_compression']==2:meta=gzip.decompress(meta)
 fields=json.loads(meta)['vector_layers'];assert len(fields)==1 and fields[0]['id']=='drenaje'
 assert set(fields[0]['fields'])=={'NOMBRE_GEOGRAFICO','origen_id'}
 assert m['entidades']==92 and m['excluidos_invalidos']==[] and set(m['reparados_autorizados'])==REPARADOS
 assert len(set(m['ids_seleccionados']))==92 and REPARADOS.issubset(m['ids_seleccionados'])
 assert sha((OUT/'control_90_previo.json').read_bytes())==CONTROL_90_SHA256
 baseline=load(OUT/'control_90_previo.json');current={r['id']:r for r in m['huellas_originales']}
 for old in baseline['entidades']:
  assert all(current[old['id']][k]==old[k] for k in ['sha256_wkb_original','sha256_feature_referencia'])
 repairs=load(OUT/'reparaciones.json');assert {r['fid'] for r in repairs['reparaciones']}==REPARADOS
 assert repairs['fuente_sin_cambios'] and repairs['otras_90_sin_cambios']
 assert repairs['control_90_previo_sha256']==CONTROL_90_SHA256
 for r in repairs['reparaciones']:
  assert r['valida_despues'] and r['desplazamiento_max_vertices_m']==0 and r['diferencia_area_exacta_m2']==0
  assert r['sha256_wkb_antes']==r['sha256_wkb_original_releido']==current[r['fid']]['sha256_wkb_original']
  assert r['vertices_originales_ausentes']==0 and r['coordenadas_nuevas']==0 and r['segmentos_identicos_con_multiplicidad']
  assert r['vertices_unicos_antes']==r['vertices_unicos_despues']
  assert r['posiciones_despues']==r['posiciones_antes']+1
  assert r['poligonos_antes']==r['poligonos_despues'] and r['anillos_despues']==r['anillos_antes']+1
 expected={p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}
 lines=(OUT/'SHA256SUMS').read_text().splitlines();assert len(lines)==len(expected) and {l.split('  ',1)[1] for l in lines}==expected
 for line in lines:
  digest,name=line.split('  ',1);p=(OUT/name).resolve();assert p.is_relative_to(OUT) and sha(p.read_bytes())==digest
 print('PMTiles: SHA-256, cabecera, campos públicos, 92 entidades y dos reparaciones autorizadas verificadas.')

def preparar(args):
 from preparar_piloto_29 import GIS,geometry_info
 from reparar_drenaje40 import reparar
 private=args.privado.resolve();assert not private.is_relative_to(ROOT),'Copias privadas fuera del repositorio'
 source=args.gdb.resolve();assert source.is_dir(),'Disco/fuente desconectado; no reintentar'
 private.mkdir(parents=True,exist_ok=True)
 def source_state():
  if not source.is_dir():raise ValueError('Disco desconectado; detener sin reintentos')
  return sha(json.dumps(sorted((str(p.relative_to(source)),p.stat().st_size,p.stat().st_mtime_ns) for p in source.rglob('*') if p.is_file())).encode())
 source_before=source_state()
 assert sha((OUT/'control_90_previo.json').read_bytes())==CONTROL_90_SHA256
 baseline=load(OUT/'control_90_previo.json')
 baseline_hashes={r['id']:r for r in baseline['entidades']}
 q=GIS(args.gdal_library,args.geos_library);g,e=q.g,q.e;P,S,I,D=C.c_void_p,C.c_char_p,C.c_int,C.c_double
 defs=[('CPLSetConfigOption',None,[S,S]),('OGR_L_GetFeature',P,[P,C.c_longlong]),('OGR_G_Clone',P,[P]),('OGR_G_GetLinearGeometry',P,[P,D,P]),('OGR_G_ForceToMultiPolygon',P,[P]),('OGR_G_HasCurveGeometry',I,[P,I]),('GDALVectorTranslateOptionsNew',P,[C.POINTER(S),P]),('GDALVectorTranslateOptionsFree',None,[P]),('GDALVectorTranslate',P,[S,P,I,C.POINTER(P),P,C.POINTER(I)])]
 for n,r,a in defs:f=getattr(g,n);f.restype=r;f.argtypes=a
 e.GEOSIntersects.argtypes=[P,P];e.GEOSIntersects.restype=C.c_byte
 g.CPLSetConfigOption(b'OGR_ARC_MAX_GAP',b'25');g.CPLSetConfigOption(b'GDAL_NUM_THREADS',b'2')
 ds=g.GDALOpenEx(os.fsencode(source),4,(S*2)(b'OpenFileGDB',None),None,None)
 if not ds:raise ValueError('Fuente no legible; detener sin bucle')
 rows=[];audit=[];repairs=[];intersectados=[];curves=0;residual=0.;positions=0;polygons=0;rings=0;bbox=[180,90,-180,-90]
 try:
  layer=g.GDALDatasetGetLayerByName(ds,b'Drenaje_Doble');assert layer
  src=g.OGR_L_GetSpatialRef(layer);g.OSRSetAxisMappingStrategy(src,0)
  ptr=P();assert g.OSRExportToWkt(src,C.byref(ptr))==0;wkt=C.string_at(ptr).decode();g.VSIFree(ptr);(private/'src.wkt').write_text(wkt)
  dst=g.OSRNewSpatialReference(None);assert g.OSRSetFromUserInput(dst,b'OGC:CRS84')==0;g.OSRSetAxisMappingStrategy(dst,0)
  back=g.OCTNewCoordinateTransformation(dst,src);forward=g.OCTNewCoordinateTransformation(src,dst);assert back and forward
  control=load(ROOT/'datos/tanda_1_29/capas/departamento_amazonas.geojson')['features'];assert len(control)==1 and str(control[0]['properties']['DeCodigo'])=='91'
  controlg=g.OGR_G_CreateGeometryFromJson(json.dumps(control[0]['geometry']).encode());assert g.OGR_G_Transform(controlg,back)==0
  b=q.wkb(controlg);controlp=e.GEOSWKBReader_read(q.reader,C.create_string_buffer(b),len(b));assert controlp;g.OGR_G_DestroyGeometry(controlg)
  while True:
   if not source.is_dir():raise ValueError('Disco desconectado; detener sin reintentos')
   f=g.OGR_L_GetNextFeature(layer)
   if not f:break
   flat=None
   try:
    fid=g.OGR_F_GetFID(f);original=g.OGR_F_GetGeometryRef(f)
    if not original or g.OGR_G_IsEmpty(original):raise ValueError('Geometría vacía en la fuente')
    flat=g.OGR_G_ForceToMultiPolygon(g.OGR_G_GetLinearGeometry(original,4,None));b=q.wkb(flat);poly=e.GEOSWKBReader_read(q.reader,C.create_string_buffer(b),len(b));assert poly
    hit=e.GEOSIntersects(poly,controlp);valid=e.GEOSisValid(poly)==1;e.GEOSGeom_destroy(poly)
    if hit not in [0,1]:raise ValueError('Error al comprobar intersección')
    if not hit:continue
    intersectados.append(fid)
    if fid in REPARADOS:
     if g.OGR_G_HasCurveGeometry(original,1):raise ValueError('La fuente autorizada contiene nuevas curvas; revisar')
     fixed,report=reparar(q,flat,fid);g.OGR_G_DestroyGeometry(flat);flat=fixed
     (private/(str(fid)+'_reparado.wkb')).write_bytes(q.wkb(flat));repairs.append(report);valid=True
    if not valid:raise ValueError('Otra geometría seleccionada es inválida; no se repara: '+str(fid))
    if g.OGR_G_Is3D(original) or g.OGR_G_IsMeasured(original):raise ValueError('Dimensiones no autorizadas')
    fields=g.OGR_F_GetDefnRef(f);idx=next(i for i in range(g.OGR_FD_GetFieldCount(fields)) if g.OGR_Fld_GetNameRef(g.OGR_FD_GetFieldDefn(fields,i))==b'NOMBRE_GEOGRAFICO')
    name=g.OGR_F_GetFieldAsString(f,idx).decode() if g.OGR_F_IsFieldSetAndNotNull(f,idx) else None
    norm=unicodedata.normalize('NFKD',name or '').encode('ascii','ignore').decode().lower()
    if any(t in norm for t in ['aislamiento','aislados','piav']):raise ValueError('Revisión institucional necesaria; detener')
    native=q.json(flat);nativeb=q.wkb(original);(private/(str(fid)+'.wkb')).write_bytes(nativeb)
    curves+=bool(g.OGR_G_HasCurveGeometry(original,1));assert g.OGR_G_Transform(flat,forward)==0
    geo=q.json(flat);assert q.valid(flat);counts,reversed_count=geometry_info(geo,True)
    polygons+=counts['poligonos'];rings+=counts['anillos'];positions+=counts['posiciones']
    for polygon in geo['coordinates']:
     for ring in polygon:
      for x,y in ring:bbox=[min(bbox[0],x),min(bbox[1],y),max(bbox[2],x),max(bbox[3],y)]
    assert g.OGR_G_Transform(flat,back)==0
    inverse=q.json(flat)
    def resid(a,b):
     if isinstance(a[0],(int,float)):return math.hypot(a[0]-b[0],a[1]-b[1])
     assert len(a)==len(b);return max(resid(x,y) for x,y in zip(a,b))
    residual=max(residual,resid(native['coordinates'],inverse['coordinates']))
    row={'type':'Feature','id':fid,'properties':{'NOMBRE_GEOGRAFICO':name,'origen_id':fid},'geometry':geo}
    reference_hash=sha(json.dumps(row,ensure_ascii=False,separators=(',',':')).encode())
    if fid not in REPARADOS:
     old=baseline_hashes.get(fid)
     if not old or old['sha256_wkb_original']!=sha(nativeb) or old['sha256_feature_referencia']!=reference_hash:raise ValueError('Cambió una de las otras 90 entidades: '+str(fid))
    rows.append(row);audit.append({'id':fid,'sha256_wkb_original':sha(nativeb),'sha256_feature_referencia':reference_hash,'anillos_reorientados':reversed_count})
   finally:
    if flat:g.OGR_G_DestroyGeometry(flat)
    g.OGR_F_Destroy(f)
  for fid in REPARADOS:
   if not source.is_dir():raise ValueError('Disco desconectado; detener sin reintentos')
   f=g.OGR_L_GetFeature(layer,fid);assert f
   try:
    current=sha(q.wkb(g.OGR_F_GetGeometryRef(f)))
    report=next(r for r in repairs if r['fid']==fid)
    if current!=report['sha256_wkb_antes']:raise ValueError('Cambió el original de una reparación')
    report['sha256_wkb_original_releido']=current
   finally:g.OGR_F_Destroy(f)
  e.GEOSGeom_destroy(controlp)
 finally:g.GDALClose(ds)
 if len(intersectados)!=92 or len(rows)!=92:raise ValueError('La fuente o selección cambió; requiere revisión')
 if source_state()!=source_before:raise ValueError('Cambió un archivo de la geodatabase durante el análisis')
 write(OUT/'reparaciones.json',{'autorizacion':'Alejandro, opción B en PR #41, 2026-11-11','fuente_sin_cambios':True,'huella_metadatos_archivos_fuente':source_before,'control_fuente':'OpenFileGDB solo lectura; tamaños/mtime de archivos idénticos y WKB de los dos originales releídos idénticos','otras_90_sin_cambios':True,'control_90_previo_sha256':sha((OUT/'control_90_previo.json').read_bytes()),'reparaciones':repairs})
 ref=private/'referencia_validada_linealizada.geojson';ref.write_text(json.dumps({'type':'FeatureCollection','features':rows},ensure_ascii=False,allow_nan=False,separators=(',',':')),encoding='utf8')
 OUT.mkdir(parents=True,exist_ok=True);target=OUT/'drenaje_doble.pmtiles'
 inputds=g.GDALOpenEx(os.fsencode(ref),4,None,None,None);assert inputds
 options=['-f','PMTiles','-nln','drenaje','-preserve_fid','-dsco','MINZOOM=5','-dsco','MAXZOOM=12','-dsco','EXTENT=4096','-dsco','BUFFER=80','-dsco','SIMPLIFICATION=1','-dsco','SIMPLIFICATION_MAX_ZOOM=0','-dsco','MAX_SIZE=100000000','-dsco','MAX_FEATURES=200000','-dsco','NAME=Drenaje doble - POC con 92 entidades','-dsco','DESCRIPTION=IGAC 2022 segun ficha POD 013; 92 entidades; Caqueta 484 y Putumayo 2165 corregidos con MakeValid en copias; no oficial']
 argv=(S*(len(options)+1))(*(v.encode() for v in options),None);opt=g.GDALVectorTranslateOptionsNew(argv,None);assert opt;err=I()
 try:
  out=g.GDALVectorTranslate(os.fsencode(target),None,1,(P*1)(inputds),opt,C.byref(err))
  if not out or err.value:raise ValueError('Falló GDALVectorTranslate')
  g.GDALClose(out)
 finally:g.GDALVectorTranslateOptionsFree(opt);g.GDALClose(inputds)
 b=target.read_bytes();h=header(b);refb=ref.read_bytes()
 meta={'id':'drenaje_doble_pmtiles','nombre':'Drenaje doble · teselas','fuente':'IGAC 2022, según ficha POD 013','anio':2022,'advertencia':'Incluye 92 entidades. Río Caquetá (484) y Río Putumayo (2165): corrección topológica MakeValid en copias autorizada; originales intactos. Solo visualización; no acredita navegabilidad, límites ni áreas.','entidades':92,'intersectan_departamento':92,'excluidos_invalidos':[],'reparados_autorizados':sorted(REPARADOS),'ids_seleccionados':[r['id'] for r in rows],'curvas_linealizadas':curves,'bbox':bbox,'bytes':len(b),'sha256':sha(b),'minzoom':5,'maxzoom':12,'extent':4096,'buffer':80,'simplification':1,'simplification_max_zoom':0,'max_size_configurado':100000000,'max_features_configurado':200000,'curvas':{'paso_angular_max_grados':4,'separacion_max_configurada_m':25,'nota':'Conversión necesaria de curvas a segmentos antes de MVT. No se elimina ningún vértice lineal. Referencia y teselas usan la misma linealización; no es una comparación exacta con curvas analíticas.'},'gdal':g.GDALVersionInfo(b'RELEASE_NAME').decode(),'geos':e.GEOSversion().decode(),'src_origen':'MAGNA CTM12, metros','src_referencia':'OGC:CRS84','src_teselas':'EPSG:3857','referencia_bytes':len(refb),'referencia_gzip_6':len(gzip.compress(refb,compresslevel=6,mtime=0)),'referencia_sha256':sha(refb),'poligonos_referencia':polygons,'anillos_referencia':rings,'posiciones_referencia':positions,'residuo_inverso_m':residual,'cabecera':h,'huellas_originales':audit}
 escribir_catalogo(meta)
 print('Generado',len(b),'bytes; referencia',len(refb),'bytes; curvas',curves,flush=True)
 comprobar()
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--comprobar',action='store_true');parser.add_argument('--gdb',type=Path);parser.add_argument('--privado',type=Path);parser.add_argument('--gdal-library');parser.add_argument('--geos-library');a=parser.parse_args()
 try:
  if a.comprobar:comprobar()
  elif all([a.gdb,a.privado,a.gdal_library,a.geos_library]):preparar(a)
  else:parser.error('Indique fuente, copias privadas y bibliotecas GIS; o --comprobar')
 except (ValueError,AssertionError,OSError,KeyError) as error:raise SystemExit('PMTiles no preparado: '+str(error))
