#!/usr/bin/env python3
"""#44: OBJECTID 19 sin reparación; añade sus teselas sin reteselear las doce del #47."""
import argparse,ctypes as C,json,os,sys,collections,struct,gzip,subprocess
from pathlib import Path
import unificar_rondas46 as u
ROOT=u.ROOT;OUT=u.OUT
BASE='df1a50bd25327f751d4422aad34ef9d92a4ec2fd'
ORIGINAL='2c60f8a2a4c1ab72abe471654ae75169a301d422574bd662be6f733757d6436f'
NOTE='Determinante 19 publicada desde Determinantes_Ambientales_CAR (OBJECTID 19), sin ajustes. Difiere aproximadamente 53 m de Rondas_Hidricas FID 1; observación técnica documentada, sin corregir ninguna de las dos fuentes (decisión POD, 18 de noviembre, #44).'
def prepare(a):
 from preparar_piloto_29 import GIS
 private=a.privado.resolve();source=a.gdb.resolve()
 assert not private.is_relative_to(ROOT) and not any(p.suffix.lower()=='.gdb' for p in [private,*private.parents])
 if not source.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
 private.mkdir(parents=True,exist_ok=True)
 def state():
  if not source.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
  return u.sha(json.dumps(sorted((p.name,p.stat().st_size,p.stat().st_mtime_ns) for p in source.iterdir() if p.is_file())).encode())
 before=state();q=GIS(a.gdal_library,a.geos_library);g=q.g;P,S,I=C.c_void_p,C.c_char_p,C.c_int
 defs=[('OGR_L_GetFIDColumn',S,[P]),('OGR_L_GetFeature',P,[P,C.c_longlong]),('OGR_L_GetLayerDefn',P,[P]),('OGR_G_HasCurveGeometry',I,[P,I]),('OGR_G_PointOnSurface',P,[P]),('OGR_G_GetEnvelope',None,[P,P]),('GDALGetDriverByName',P,[S]),('GDALCreate',P,[P,S,I,I,I,I,P]),('GDALDatasetCreateLayer',P,[P,S,P,I,P]),('OGR_Fld_Create',P,[S,I]),('OGR_L_CreateField',I,[P,P,I]),('OGR_Fld_Destroy',None,[P]),('OGR_F_Create',P,[P]),('OGR_F_SetFieldInteger',None,[P,I,I]),('OGR_F_SetFieldString',None,[P,I,S]),('OGR_F_SetFID',I,[P,C.c_longlong]),('OGR_F_SetGeometry',I,[P,P]),('OGR_L_CreateFeature',I,[P,P]),('GDALVectorTranslateOptionsNew',P,[C.POINTER(S),P]),('GDALVectorTranslateOptionsFree',None,[P]),('GDALVectorTranslate',P,[S,P,I,C.POINTER(P),P,C.POINTER(I)])]
 for n,r,args in defs:f=getattr(g,n);f.restype=r;f.argtypes=args
 src=g.GDALOpenEx(os.fsencode(source),4,(S*2)(b'OpenFileGDB',None),None,None);assert src
 ds=None;shape=None;forward=None;target=None
 try:
  layer=g.GDALDatasetGetLayerByName(src,b'Determinantes_Ambientales_CAR');assert layer and g.OGR_L_GetFIDColumn(layer).decode().upper()=='OBJECTID'
  f=g.OGR_L_GetFeature(layer,19);assert f and g.OGR_F_GetFID(f)==19
  try:
   definition=g.OGR_F_GetDefnRef(f);names=[g.OGR_Fld_GetNameRef(g.OGR_FD_GetFieldDefn(definition,i)).decode() for i in range(g.OGR_FD_GetFieldCount(definition))]
   vals={k:g.OGR_F_GetFieldAsString(f,names.index(k)).decode() for k in ['Nombre','Norma_Asociada','CAR_AA']}
   assert vals=={'Nombre':'Rondas hídricas','Norma_Asociada':'Resolución 957 de 2018','CAR_AA':'Corpoamazonia'}
   geom=g.OGR_F_GetGeometryRef(f);assert geom and not g.OGR_G_IsEmpty(geom) and not g.OGR_G_HasCurveGeometry(geom,0) and not g.OGR_G_Is3D(geom) and not g.OGR_G_IsMeasured(geom)
   b=q.wkb(geom);assert u.sha(b)==ORIGINAL and q.valid(geom),'Cambió la fuente o su validez; detener sin corregir'
   (private/'original_19.wkb').write_bytes(b)
   sr=g.OGR_L_GetSpatialRef(layer);g.OSRSetAxisMappingStrategy(sr,0)
   gpkg=private/'ronda19.gpkg';assert not gpkg.exists()
   ds=g.GDALCreate(g.GDALGetDriverByName(b'GPKG'),os.fsencode(gpkg),0,0,0,0,None);assert ds
   out=g.GDALDatasetCreateLayer(ds,b'rondas',sr,6,(S*2)(b'SPATIAL_INDEX=NO',None));assert out
   props={'objectid':19,'Nombre':vals['Nombre'],'Norma_Asociada':vals['Norma_Asociada'],'Fuente':vals['CAR_AA'],'Anio':2022}
   for key,value in props.items():fd=g.OGR_Fld_Create(key.encode(),0 if isinstance(value,int) else 4);assert g.OGR_L_CreateField(out,fd,1)==0;g.OGR_Fld_Destroy(fd)
   copied=g.OGR_F_Create(g.OGR_L_GetLayerDefn(out))
   try:
    assert g.OGR_F_SetFID(copied,19)==0
    for i,(key,value) in enumerate(props.items()):
     if isinstance(value,int):g.OGR_F_SetFieldInteger(copied,i,value)
     else:g.OGR_F_SetFieldString(copied,i,value.encode())
    assert g.OGR_F_SetGeometry(copied,geom)==0 and g.OGR_L_CreateFeature(out,copied)==0
   finally:g.OGR_F_Destroy(copied)
   native=q.json(geom);polygons=len(native['coordinates']);rings=sum(map(len,native['coordinates']));vertices=sum(len(r) for p in native['coordinates'] for r in p)
   shape=P();assert g.OGR_G_CreateFromWkb(C.create_string_buffer(b),sr,C.byref(shape),len(b))==0
   target=g.OSRNewSpatialReference(None);assert g.OSRSetFromUserInput(target,b'OGC:CRS84')==0;g.OSRSetAxisMappingStrategy(target,0);forward=g.OCTNewCoordinateTransformation(sr,target);assert forward
   point=g.OGR_G_PointOnSurface(geom);assert point
   try:assert g.OGR_G_Transform(point,forward)==0;pt=q.json(point)['coordinates']
   finally:g.OGR_G_DestroyGeometry(point)
   assert g.OGR_G_Transform(shape,forward)==0
   (private/'referencia_19.geojson').write_text(json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','id':19,'properties':props,'geometry':q.json(shape)}]},ensure_ascii=False,separators=(',',':')))
   envelope=(C.c_double*4)();g.OGR_G_GetEnvelope(shape,envelope);bbox=[envelope[0],envelope[2],envelope[1],envelope[3]]
  finally:g.OGR_F_Destroy(f)
 finally:
  if shape:g.OGR_G_DestroyGeometry(shape)
  if ds:g.GDALClose(ds)
  if forward:g.OCTDestroyCoordinateTransformation(forward)
  if target:g.OSRDestroySpatialReference(target)
  g.GDALClose(src)
 assert state()==before,'La fuente cambió durante lectura'
 ds=g.GDALOpenEx(os.fsencode(gpkg),4,None,None,None);assert ds
 try:
  l=g.GDALDatasetGetLayerByName(ds,b'rondas');f=g.OGR_L_GetFeature(l,19);assert f
  try:reloaded=u.sha(q.wkb(g.OGR_F_GetGeometryRef(f)));assert reloaded==ORIGINAL and q.valid(g.OGR_F_GetGeometryRef(f))
  finally:g.OGR_F_Destroy(f)
  dest=private/'ronda19.pmtiles';assert not dest.exists()
  args=['-f','PMTiles','rondas','-nln','rondas','-preserve_fid','-dsco','MINZOOM=5','-dsco','MAXZOOM=12','-dsco','EXTENT=4096','-dsco','BUFFER=80','-dsco','SIMPLIFICATION=0','-dsco','SIMPLIFICATION_MAX_ZOOM=0','-dsco','MAX_SIZE=100000000','-dsco','MAX_FEATURES=200000']
  opts=g.GDALVectorTranslateOptionsNew((S*(len(args)+1))(*(s.encode() for s in args),None),None);error=I()
  try:
   result=g.GDALVectorTranslate(os.fsencode(dest),None,1,(P*1)(ds),opts,C.byref(error));assert result and not error.value;g.GDALClose(result)
  finally:g.GDALVectorTranslateOptionsFree(opts)
 finally:g.GDALClose(ds)
 proof={'objectid':19,'fuente_geometria':'Determinantes_Ambientales_CAR','campo_id':'OBJECTID','sha256_original':ORIGINAL,'sha256_copia_nativa_releida':reloaded,'valida_geos':True,'reparada':False,'sin_curvas':True,'poligonos':polygons,'anillos':rings,'posiciones':vertices,'fuente_sin_cambios_metadata':True,'bbox':bbox,'atributos':props,'campos_ausentes':['fid_ronda','Fuente_hidrica','Longitud_buffer'],'gdal':g.GDALVersionInfo(b'RELEASE_NAME').decode(),'geos':q.e.GEOSversion().decode(),'sha256_teselas_19':u.sha(dest.read_bytes()),'punto_prueba':{'determinante':19,'lng':pt[0],'lat':pt[1]},'observacion':NOTE,'distancias_homologas_m':{'min':53.14623516100448,'mediana':53.220688876410144,'max':53.3147647850908,'metodo':'Control previo #44: posiciones homólogas en SRC métrico, no Hausdorff; no se usa para ajustar coordenadas.'},'parametros':{'minzoom':5,'maxzoom':12,'extent':4096,'buffer':80,'simplification':0,'simplification_max_zoom':0}}
 u.dump(private/'control19.json',proof);print('Copia 19 válida e idéntica:',polygons,'polígonos,',rings,'anillos,',vertices,'posiciones;',dest.stat().st_size,'bytes',flush=True)

def integrate(private):
 p=u.load(private/'control19.json');b19=(private/'ronda19.pmtiles').read_bytes();assert p['sha256_original']==p['sha256_copia_nativa_releida']==ORIGINAL and u.sha(b19)==p['sha256_teselas_19']
 baseline=subprocess.run(['git','show',BASE+':datos/rondas_46/rondas.pmtiles'],cwd=ROOT,check=True,capture_output=True).stdout
 grouped=collections.defaultdict(list);a=u.Audit();old=u.Audit()
 for tid,raw in u.tiles(baseline):
  fs,keys,values=u.layer(raw)
  for f in fs:old.add(tid,f,keys,values)
  grouped[tid].append(raw)
 for tid,raw in u.tiles(b19):
  fs,keys,values=u.layer(raw)
  for f in fs:a.add(tid,f,keys,values)
  grouped[tid].insert(0,raw)
 combined={tid:u.merge(parts) for tid,parts in sorted(grouped.items())};boxes=[struct.unpack_from('<4i',b,102) for b in [baseline,b19]];box=[min(b[i] for b in boxes) if i<2 else max(b[i] for b in boxes) for i in range(4)]
 h=u.header(baseline);meta=json.loads(gzip.decompress(baseline[h['metadata_offset']:h['metadata_offset']+h['metadata_bytes']]));meta.update(description='Determinantes 19–31. La 19 conserva la geometría del catálogo; observación técnica #44 sin corrección.',bounds=','.join(str(x/1e7) for x in box))
 out=u.archive(combined,meta,box);(OUT/'rondas.pmtiles').write_bytes(out);after=u.Audit()
 for tid,raw in u.tiles(out):
  fs,keys,values=u.layer(raw)
  for f in fs:after.add(tid,f,keys,values)
 assert old.result()==[r for r in after.result() if r['determinante']!=19],'Cambiaron las doce fuentes anteriores'
 assert a.result()==[r for r in after.result() if r['determinante']==19] and len(a.result())==8
 p.update(antes_mvt=a.result(),despues_mvt=[r for r in after.result() if r['determinante']==19],sha256_base_12=u.sha(baseline),revision_base=BASE);u.dump(OUT/'determinante_19.json',p)
 d=u.load(OUT/'entrega.json');d.update(bytes=len(out),sha256=u.sha(out),bbox=[x/1e7 for x in box],determinantes=list(range(19,32)),pendientes=[],teselas=len(combined),tesela_comprimida_max_bytes=max(len(u.gz(raw)) for raw in combined.values()));u.dump(OUT/'entrega.json',d)
 u.integrate();u.manifest();u.check()
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--gdb',type=Path);p.add_argument('--privado',type=Path);p.add_argument('--integrar',type=Path);p.add_argument('--gdal-library',default='/Applications/QGIS.app/Contents/Frameworks/libgdal.dylib');p.add_argument('--geos-library',default='/Applications/QGIS.app/Contents/Frameworks/libgeos_c.dylib');a=p.parse_args()
 if a.gdb:
  if not a.privado:p.error('--gdb requiere --privado')
  prepare(a)
 elif a.integrar:integrate(a.integrar.resolve())
 else:u.check()
