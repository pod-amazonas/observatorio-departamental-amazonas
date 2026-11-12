#!/usr/bin/env python3
"""Rondas #43: original en lectura, copias verificadas y teselas 20–31.
La 19 permanece pendiente por decisión de Alejandro (#44). Sin instalaciones.
"""
import argparse,ctypes as C,sys,os,json,hashlib,unicodedata,gzip,shutil
from pathlib import Path
from rondas43_integridad import stats,unique,compare
from preparar_pmtiles40 import header
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'datos/rondas_43'

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,obj):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,allow_nan=False,indent=2)+'\n',encoding='utf8')
def new_gis(args):
 from preparar_piloto_29 import GIS
 return GIS(args.gdal_library,args.geos_library)
def private(args):
 p=args.privado.resolve()
 if p.is_relative_to(ROOT):raise ValueError('Las copias deben estar fuera del repositorio')
 if any(part.suffix.lower()=='.gdb' for part in [p,*p.parents]):raise ValueError('No escribir copias dentro de una geodatabase')
 if args.gdb and p.is_relative_to(args.gdb.resolve()):raise ValueError('No guardar copias dentro de la fuente')
 p.mkdir(parents=True,exist_ok=True);args.privado=p

def verificar_src(q,path):
 # PROJ puede normalizar nombres/autoridades del mismo CRS. Comparar
 # semántica evita confundir esos cambios de WKT con un cambio de ubicación.
 g=q.g;g.OSRIsSame.restype=C.c_int;g.OSRIsSame.argtypes=[C.c_void_p,C.c_void_p];refs=[]
 try:
  for wkt in [path.read_bytes(),load(PUBLIC/'control_origen.json')['src_wkt_referencia'].encode()]:
   ref=g.OSRNewSpatialReference(None);assert g.OSRSetFromUserInput(ref,wkt)==0;g.OSRSetAxisMappingStrategy(ref,0);refs.append(ref)
  if not g.OSRIsSame(*refs):raise ValueError('Cambió el SRC nativo; detener')
 finally:
  for ref in refs:g.OSRDestroySpatialReference(ref)

def verificar_fuente_control(review):
 expected={r['fid']:r for r in load(PUBLIC/'control_origen.json')['registros']}
 if len(review['registros_revisados'])!=13:raise ValueError('Deben revisarse 13 registros')
 for r in review['registros_revisados']:
  if r['fid'] not in expected or r['sha256_wkb_original']!=expected[r['fid']]['sha256_wkb_original'] or r['valida_geos']!=expected[r['fid']]['valida_geos']:raise ValueError('Cambió la fuente aprobada; detener')

def origen(args):
 src=args.gdb.resolve()
 if not src.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
 q=new_gis(args);g,e=q.g,q.e;P,S,I,D=C.c_void_p,C.c_char_p,C.c_int,C.c_double
 for n,r,a in [('OGR_G_GetGeometryName',S,[P]),('OGR_G_HasCurveGeometry',I,[P,I]),('OGR_G_GetLinearGeometry',P,[P,D,P]),('CPLSetConfigOption',None,[S,S])]:f=getattr(g,n);f.restype=r;f.argtypes=a
 e.GEOSisValidReason.restype=P;e.GEOSisValidReason.argtypes=[P];e.GEOSFree.restype=None;e.GEOSFree.argtypes=[P]
 g.CPLSetConfigOption(b'OGR_ARC_MAX_GAP',b'25');ds=g.GDALOpenEx(os.fsencode(src),4,(S*2)(b'OpenFileGDB',None),None,None)
 if not ds:raise SystemExit('Fuente no legible; detener')
 out=args.privado;out.mkdir(exist_ok=True)
 def source_state():
  if not src.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
  return hashlib.sha256(json.dumps(sorted((str(p.relative_to(src)),p.stat().st_size,p.stat().st_mtime_ns) for p in src.rglob('*') if p.is_file())).encode()).hexdigest()
 source_before=source_state()
 records=[];invalid=False
 try:
  layer=g.GDALDatasetGetLayerByName(ds,b'Rondas_Hidricas');assert layer
  ref=g.OGR_L_GetSpatialRef(layer);ptr=P();assert g.OSRExportToWkt(ref,C.byref(ptr))==0;(out/'src.wkt').write_bytes(C.string_at(ptr));g.VSIFree(ptr)
  verificar_src(q,out/'src.wkt')
  fieldrows=[]
  while True:
   if not src.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
   f=g.OGR_L_GetNextFeature(layer)
   if not f:break
   flat=None
   try:
    fid=g.OGR_F_GetFID(f)
    expected_fields=['Fuente_hidrica','Longitud_buffer','Shape_Length','Shape_Area']
    definition=g.OGR_F_GetDefnRef(f);actual_fields=[g.OGR_Fld_GetNameRef(g.OGR_FD_GetFieldDefn(definition,i)).decode() for i in range(g.OGR_FD_GetFieldCount(definition))]
    if actual_fields!=expected_fields:raise ValueError('Cambió el esquema de fuente: requiere revisión')
    vals={name:g.OGR_F_GetFieldAsString(f,i).decode() for i,name in enumerate(expected_fields)}
    norm=unicodedata.normalize('NFKD',json.dumps(vals,ensure_ascii=False)).encode('ascii','ignore').decode().lower()
    if any(t in norm for t in ['aislamiento','aislados','piav']):raise ValueError('Revisión de sensibilidad necesaria; detener')
    fieldrows.append({'fid':fid,'properties':vals})
    geom=g.OGR_F_GetGeometryRef(f);assert geom and not g.OGR_G_IsEmpty(geom),'Geometría nula/vacía'
    curved=bool(g.OGR_G_HasCurveGeometry(geom,1));original=q.wkb(geom)
    (out/(str(fid)+'_original.wkb')).write_bytes(original)
    flat=g.OGR_G_GetLinearGeometry(geom,4,None) if curved else None;tested=flat or geom
    b=q.wkb(tested);geos=e.GEOSWKBReader_read(q.reader,C.create_string_buffer(b),len(b));assert geos
    try:
     valid=e.GEOSisValid(geos)==1;ptr=e.GEOSisValidReason(geos);reason=C.string_at(ptr).decode();e.GEOSFree(ptr)
    finally:e.GEOSGeom_destroy(geos)
    name=g.OGR_F_GetFieldAsString(f,0).decode()
    r={'fid':fid,'fuente_hidrica':name,'geometria':g.OGR_G_GetGeometryName(geom).decode(),'curvas':curved,'valida_geos':valid,'motivo_privado':reason,'sha256_wkb_original':hashlib.sha256(original).hexdigest(),'geos':e.GEOSversion().decode()};records.append(r)
    print(json.dumps({k:v for k,v in r.items() if k!='motivo_privado'},ensure_ascii=False),flush=True)
    if not valid:
     print('INVÁLIDA: '+str(fid)+' — '+reason.split('[')[0],flush=True);invalid=True
   finally:
    if flat:g.OGR_G_DestroyGeometry(flat)
    g.OGR_F_Destroy(f)
 finally:g.GDALClose(ds)
 assert len(records)==13
 assert source_state()==source_before,'Cambió la fuente durante lectura'
 (out/'validacion_privada.json').write_text(json.dumps({'fuente_metadata_sha256':source_before,'fuente_sin_cambios':True,'registros_revisados':records},ensure_ascii=False,indent=2))
 print('Revisión completa; inválidos:',[r['fid'] for r in records if not r['valida_geos']]);print('Ninguna reparación ni publicación realizada.')

 (out/'atributos_privados.json').write_text(json.dumps(fieldrows,ensure_ascii=False,indent=2))
 verificar_fuente_control(load(out/'validacion_privada.json'))

def correspondencia(args):
 src=args.gdb.resolve()
 if not src.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
 q=new_gis(args);g=q.g;P,S,I=C.c_void_p,C.c_char_p,C.c_int
 for n,r,a in [('OGR_L_GetLayerDefn',P,[P]),('OGR_L_GetFeatureCount',C.c_longlong,[P,I]),('OGR_L_GetFeature',P,[P,C.c_longlong]),('OGR_L_SetIgnoredFields',I,[P,C.POINTER(S)])]:f=getattr(g,n);f.restype=r;f.argtypes=a
 ds=g.GDALOpenEx(os.fsencode(src),4,(S*2)(b'OpenFileGDB',None),None,None);assert ds
 base=args.privado;review=json.loads((base/'validacion_privada.json').read_text());byhash={r['sha256_wkb_original']:r['fid'] for r in review['registros_revisados']};records=[]
 try:
  for name in ['Determinantes_Ambientales_CAR']:
   layer=g.GDALDatasetGetLayerByName(ds,name.encode());assert layer
   d=g.OGR_L_GetLayerDefn(layer);fields=[g.OGR_Fld_GetNameRef(g.OGR_FD_GetFieldDefn(d,i)).decode() for i in range(g.OGR_FD_GetFieldCount(d))]
   print(name,'registros',g.OGR_L_GetFeatureCount(layer,1),'campos',fields,flush=True)
   if name!='Determinantes_Ambientales_CAR':continue
   assert g.OGR_L_SetIgnoredFields(layer,(S*2)(b'OGR_GEOMETRY',None))==0
   attrs=[]
   for oid in range(19,32):
    if not src.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
    f=g.OGR_L_GetFeature(layer,oid);assert f
    try:
     vals={k:g.OGR_F_GetFieldAsString(f,i).decode() if g.OGR_F_IsFieldSetAndNotNull(f,i) else None for i,k in enumerate(fields)}
     norm=unicodedata.normalize('NFKD',json.dumps(vals,ensure_ascii=False)).encode('ascii','ignore').decode().lower()
     if any(t in norm for t in ['aislamiento','aislados','piav']):raise SystemExit('Sensibilidad: detener antes de geometrías')
     attrs.append((oid,vals));print('Det',oid,{k:v for k,v in vals.items() if k in ['Nombre','Norma_Asociada','LEYENDA','CAR_AA']},flush=True)
    finally:g.OGR_F_Destroy(f)
   assert g.OGR_L_SetIgnoredFields(layer,(S*1)(None))==0
   for oid,vals in attrs:
    if not src.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
    f=g.OGR_L_GetFeature(layer,oid);assert f
    try:
     raw=q.wkb(g.OGR_F_GetGeometryRef(f));digest=hashlib.sha256(raw).hexdigest();matched=byhash.get(digest)
     records.append({'objectid':oid,'properties':vals,'sha256_wkb_determinante':digest,'fid_ronda_por_wkb_exacto':matched});print('Correspondencia WKB',oid,matched,flush=True)
     if not matched:(base/f'determinante_{oid}_original.wkb').write_bytes(raw)
    finally:g.OGR_F_Destroy(f)
 finally:g.GDALClose(ds)
 (base/'correspondencia_privada.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))

def copias(args):
 base=args.privado;out=base/'reparaciones';out.mkdir(exist_ok=True)
 review=json.loads((base/'validacion_privada.json').read_text());verificar_fuente_control(review);authorized=[r for r in review['registros_revisados'] if not r['valida_geos']]
 assert len(review['registros_revisados'])==13 and [r['fid'] for r in authorized]==[6,7,8,9]
 q=new_gis(args);g=q.g;P,S=C.c_void_p,C.c_char_p
 g.OGR_G_MakeValidEx.restype=P;g.OGR_G_MakeValidEx.argtypes=[P,C.POINTER(S)]

 reports=[]
 for rec in authorized:
  fid=rec['fid'];source=base/f'{fid}_original.wkb';raw=source.read_bytes();assert hashlib.sha256(raw).hexdigest()==rec['sha256_wkb_original']
  geom=P();assert g.OGR_G_CreateFromWkb(C.create_string_buffer(raw),None,C.byref(geom),len(raw))==0;del raw
  print('MakeValid LINEWORK en copia FID',fid,flush=True);fixed=None
  try:
   fixed=g.OGR_G_MakeValidEx(geom,(S*2)(b'METHOD=LINEWORK',None));assert fixed
   valid=q.valid(fixed);target=out/f'{fid}_reparado.wkb';target.write_bytes(q.wkb(fixed))
   assert hashlib.sha256(q.wkb(geom)).hexdigest()==rec['sha256_wkb_original'],'Se alteró la entrada de análisis'
  finally:
   if fixed:g.OGR_G_DestroyGeometry(fixed)
   g.OGR_G_DestroyGeometry(geom)
  print('Calculando áreas exactas y vértices',fid,flush=True)
  pa=out/f'{fid}_antes.points';pb=out/f'{fid}_despues.points'
  before,area_before=stats(source,pa);after,area_after=stats(target,pb)
  delta=area_after-area_before
  print('Delta de área exacta',fid,str(delta),float(delta),'m2',flush=True)
  movement=compare(unique(pa),unique(pb));report={'fid':fid,'valida_antes':False,'valida_despues':valid,'gdal':g.GDALVersionInfo(b'RELEASE_NAME').decode(),'geos':q.e.GEOSversion().decode(),'metodo':'OGR_G_MakeValidEx, METHOD=LINEWORK; SRC nativo, sin reproyectar ni simplificar','antes':before,'despues':after,**movement,'diferencia_area_exacta_m2':float(delta),'diferencia_area_numerador':str(delta.numerator),'diferencia_area_denominador':str(delta.denominator),'sha256_original':rec['sha256_wkb_original'],'sha256_reparado':hashlib.sha256(target.read_bytes()).hexdigest()}
  assert hashlib.sha256(source.read_bytes()).hexdigest()==rec['sha256_wkb_original']
  reports.append(report);(out/'evaluacion.json').write_text(json.dumps({'invalidos_en_origen':[r['fid'] for r in authorized],'evaluados':reports},ensure_ascii=False,indent=2))
  print(json.dumps(report,ensure_ascii=False),flush=True)
  if delta!=0 or movement['desplazamiento_max_vertices_m']!=0 or not valid:
   print('DETENER: la corrección no cumple 0 m / 0 m2; no continuar ni publicar',flush=True);raise SystemExit(3)
 print('Todas las correcciones cumplen 0 m y 0 m2; ninguna tesela generada todavía',flush=True)

def teselas(args):
 base=args.privado;out=base/'paquete';out.mkdir(exist_ok=True)
 review=json.loads((base/'validacion_privada.json').read_text());rep=json.loads((base/'reparaciones/evaluacion.json').read_text());cor=json.loads((base/'correspondencia_privada.json').read_text());attrs=json.loads((base/'atributos_privados.json').read_text())
 verificar_fuente_control(review)
 assert len(review['registros_revisados'])==13 and len(rep['evaluados'])==4
 assert all(x['valida_despues'] and x['desplazamiento_max_vertices_m']==0 and x['diferencia_area_numerador']=='0' for x in rep['evaluados'])
 q=new_gis(args);g=q.g;P,S,I=C.c_void_p,C.c_char_p,C.c_int
 for n,r,a in [('GDALGetDriverByName',P,[S]),('GDALCreate',P,[P,S,I,I,I,I,P]),('GDALDatasetCreateLayer',P,[P,S,P,I,P]),('OGR_Fld_Create',P,[S,I]),('OGR_L_CreateField',I,[P,P,I]),('OGR_Fld_Destroy',None,[P]),('OGR_L_GetLayerDefn',P,[P]),('OGR_F_Create',P,[P]),('OGR_F_SetFieldString',None,[P,I,S]),('OGR_F_SetFieldInteger',None,[P,I,I]),('OGR_F_SetFID',I,[P,C.c_longlong]),('OGR_F_SetGeometry',I,[P,P]),('OGR_L_CreateFeature',I,[P,P]),('GDALVectorTranslateOptionsNew',P,[C.POINTER(S),P]),('GDALVectorTranslateOptionsFree',None,[P]),('GDALVectorTranslate',P,[S,P,I,C.POINTER(P),P,C.POINTER(I)]),('OGR_G_GetEnvelope',None,[P,P]),('CPLSetConfigOption',None,[S,S])]:f=getattr(g,n);f.restype=r;f.argtypes=a
 verificar_src(q,base/'src.wkt')
 src=g.OSRNewSpatialReference(None);assert g.OSRSetFromUserInput(src,(base/'src.wkt').read_bytes())==0;g.OSRSetAxisMappingStrategy(src,0)
 geo=g.OSRNewSpatialReference(None);assert g.OSRSetFromUserInput(geo,b'OGC:CRS84')==0;g.OSRSetAxisMappingStrategy(geo,0);trans=g.OCTNewCoordinateTransformation(src,geo);assert trans
 g.CPLSetConfigOption(b'GDAL_NUM_THREADS',b'2')
 fields=[('objectid',0),('fid_ronda',0),('Nombre',4),('Norma_Asociada',4),('Fuente',4),('Anio',0),('Fuente_hidrica',4),('Longitud_buffer',0)]
 path=out/'referencia_nativa.gpkg'
 if path.exists():raise SystemExit('La copia de trabajo ya existe; no sobrescribir a ciegas')
 ds=g.GDALCreate(g.GDALGetDriverByName(b'GPKG'),str(path).encode(),0,0,0,0,None);assert ds
 results=[]
 try:
  for row in cor:
   oid=row['objectid'];fid=row['fid_ronda_por_wkb_exacto']
   if not fid:continue # 19 depende de la decisión pendiente; no inferir por orden.
   before=next(r for r in review['registros_revisados'] if r['fid']==fid);fix=next((r for r in rep['evaluados'] if r['fid']==fid),None)
   orig=base/f'{fid}_original.wkb';assert hashlib.sha256(orig.read_bytes()).hexdigest()==before['sha256_wkb_original']==row['sha256_wkb_determinante']
   used=base/'reparaciones'/f'{fid}_reparado.wkb' if fix else orig;raw=used.read_bytes()
   if fix:assert hashlib.sha256(raw).hexdigest()==fix['sha256_reparado']
   shape=P();assert g.OGR_G_CreateFromWkb(C.create_string_buffer(raw),src,C.byref(shape),len(raw))==0;del raw
   assert q.valid(shape)
   name=f'ronda_{oid}';layer=g.GDALDatasetCreateLayer(ds,name.encode(),src,0,(S*2)(b'SPATIAL_INDEX=NO',None));assert layer
   for field,typ in fields:
    fd=g.OGR_Fld_Create(field.encode(),typ);assert g.OGR_L_CreateField(layer,fd,1)==0;g.OGR_Fld_Destroy(fd)
   ar=next(x['properties'] for x in attrs if x['fid']==fid);props={'objectid':oid,'fid_ronda':fid,'Nombre':row['properties']['Nombre'],'Norma_Asociada':row['properties']['Norma_Asociada'],'Fuente':'Corpoamazonia','Anio':2022,'Fuente_hidrica':ar['Fuente_hidrica'],'Longitud_buffer':int(ar['Longitud_buffer'])}
   f=g.OGR_F_Create(g.OGR_L_GetLayerDefn(layer));assert f
   try:
    assert g.OGR_F_SetFID(f,oid)==0
    for i,(key,typ) in enumerate(fields):
     if typ==0:g.OGR_F_SetFieldInteger(f,i,props[key])
     else:g.OGR_F_SetFieldString(f,i,props[key].encode())
    assert g.OGR_F_SetGeometry(f,shape)==0;assert g.OGR_L_CreateFeature(layer,f)==0
   finally:g.OGR_F_Destroy(f)
   assert g.OGR_G_Transform(shape,trans)==0
   envelope=(C.c_double*4)();g.OGR_G_GetEnvelope(shape,envelope);g.OGR_G_DestroyGeometry(shape)
   results.append({'objectid':oid,'fid_ronda':fid,'nombre':props['Nombre'],'norma':props['Norma_Asociada'],'fuente':'Corpoamazonia','anio':2022,'fuente_hidrica':ar['Fuente_hidrica'],'longitud_buffer_atributo':props['Longitud_buffer'],'sha256_origen':before['sha256_wkb_original'],'sha256_geometria_usada':hashlib.sha256(used.read_bytes()).hexdigest(),'reparada':bool(fix),'partes_lineales_conservadas':fix['despues']['tipos'].get('2',0) if fix else 0,'bbox':[envelope[0],envelope[2],envelope[1],envelope[3]],'minzoom':5,'maxzoom':12,'dataLayer':'rondas','bytes':None})
   print('Copia nativa validada',oid,fid,flush=True)
 finally:g.GDALClose(ds)
 source=g.GDALOpenEx(str(path).encode(),4,None,None,None);assert source
 try:
  for row in results:
   oid=row['objectid'];target=out/f'determinante_{oid}.pmtiles';assert not target.exists()
   args=['-f','PMTiles',f'ronda_{oid}','-nln','rondas','-preserve_fid','-dsco','MINZOOM=5','-dsco','MAXZOOM=12','-dsco','EXTENT=4096','-dsco','BUFFER=80','-dsco','SIMPLIFICATION=1','-dsco','SIMPLIFICATION_MAX_ZOOM=0','-dsco','MAX_SIZE=100000000','-dsco','MAX_FEATURES=200000','-dsco',f'NAME=Ronda hidrica - determinante {oid}','-dsco','DESCRIPTION=Corpoamazonia 2022; Resolucion 957 de 2018; copia fiel en teselas; solo visualizacion']
   opts=g.GDALVectorTranslateOptionsNew((S*(len(args)+1))(*(s.encode() for s in args),None),None);assert opts;err=I()
   try:
    result=g.GDALVectorTranslate(str(target).encode(),None,1,(P*1)(source),opts,C.byref(err));assert result and not err.value;g.GDALClose(result)
   finally:g.GDALVectorTranslateOptionsFree(opts)
   b=target.read_bytes();row.update(bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),cabecera=header(b));(out/'catalogo_borrador.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print('Teselas',oid,len(b),flush=True)
 finally:g.GDALClose(source)
 print('Doce capas preparadas en carpeta privada, sin publicación ni modificación del catálogo web.')

def auditar_nativa(args):
 q=new_gis(args);g=q.g;P,S=C.c_void_p,C.c_char_p
 for n,r,a in [('OGR_L_GetFeature',P,[P,C.c_longlong])]:f=getattr(g,n);f.restype=r;f.argtypes=a
 base=args.privado;rows=load(base/'paquete/catalogo_borrador.json');ds=g.GDALOpenEx(os.fsencode(base/'paquete/referencia_nativa.gpkg'),4,None,None,None);assert ds
 try:
  for row in rows:
   l=g.GDALDatasetGetLayerByName(ds,('ronda_'+str(row['objectid'])).encode());assert l;f=g.OGR_L_GetFeature(l,row['objectid']);assert f
   try:
    geom=g.OGR_F_GetGeometryRef(f);assert q.valid(geom)
    actual=hashlib.sha256(q.wkb(geom)).hexdigest();assert actual==row['sha256_geometria_usada'],'GPKG alteró la copia nativa'
    row['sha256_nativa_gpkg_releida']=actual
   finally:g.OGR_F_Destroy(f)
 finally:g.GDALClose(ds)
 write(base/'paquete/catalogo_borrador.json',rows)
 print('Las 12 geometrías GPKG son válidas e idénticas a sus copias nativas verificadas.')

def manifiesto():
 files=sorted(p for p in PUBLIC.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
 (PUBLIC/'SHA256SUMS').write_text(''.join(digest(p)+'  '+p.relative_to(PUBLIC).as_posix()+'\n' for p in files))

def integrar(args):
 rows=load(args.privado/'paquete/catalogo_borrador.json');assert {r['objectid'] for r in rows}==set(range(20,32))
 controls=load(PUBLIC/'control_origen.json');expected={r['objectid']:r for r in controls['correspondencias']};repairs={r['fid']:r for r in controls['reparaciones']}
 catalog=load(ROOT/'catalogo_determinantes_para_geovisor.json');byid={c['objectid']:c for gr in catalog['grupos'] for c in gr['capas']};delivered=[]
 for row in rows:
  oid=row['objectid'];fid=row['fid_ronda'];control=expected[oid]
  assert control['fid_ronda_por_wkb_exacto']==fid and control['sha256_wkb_determinante']==row['sha256_origen']
  assert control['nombre']==row['nombre']=='Rondas hídricas' and control['norma']==row['norma']=='Resolución 957 de 2018' and control['car']==row['fuente']=='Corpoamazonia'
  assert row['sha256_nativa_gpkg_releida']==row['sha256_geometria_usada']
  if fid in repairs:
   repair=repairs[fid];assert repair['desplazamiento_max_vertices_m']==0 and repair['diferencia_area_numerador']=='0' and repair['valida_despues']
   assert row['sha256_geometria_usada']==repair['sha256_reparado']
  else:assert row['sha256_geometria_usada']==row['sha256_origen']
  source=args.privado/'paquete'/f'determinante_{oid}.pmtiles';assert source.stat().st_size==row['bytes'] and digest(source)==row['sha256']
  target=PUBLIC/'teselas'/source.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
  warning='Representación de la fuente; no certifica un acotamiento normativo ni permite calcular superficies.'
  if row['reparada']:warning+=' Geometría corregida solo en copia, sin desplazar vértices ni cambiar el área algebraica.'
  if row['partes_lineales_conservadas']:warning+=' Conserva '+str(row['partes_lineales_conservadas'])+' partes lineales tras la reparación.'
  meta=byid[oid];meta.update(nombre=row['nombre'],etiqueta=f'Rondas hídricas — entidad {oid}',archivo=None,archivoTeselas=target.relative_to(ROOT).as_posix(),estado='aprobada_disponible_teselas',fuenteDeclarada=row['fuente'],anioFuente=row['anio'],norma=row['norma'],fidFuente=fid,leyenda='Rondas hídricas'+(' y partes lineales conservadas' if row['partes_lineales_conservadas'] else ''),advertencia=warning,opacidadSugerida=.65,carga='bajo_demanda',teselas={k:row[k] for k in ['bytes','sha256','bbox','minzoom','maxzoom','dataLayer']})
  delivered.append(row)
 byid[19].update(nombre='Rondas hídricas',etiqueta='Rondas hídricas — entidad 19 (pendiente de verificación)',estado='aprobada_pendiente_verificacion_fuente',archivo=None,advertencia='Pendiente de verificar la ubicación con la fuente responsable; no se publica esta geometría.')
 byid[19].pop('archivoTeselas',None);byid[19].pop('teselas',None)
 catalog.update(estado='publicacion_autorizada_20_geojson_12_pmtiles',formato='GeoJSON y PMTiles',srcTeselas='EPSG:3857',cantidadTeselas=12,pendientes=1,nota='33 determinantes autorizadas: 20 GeoJSON y 12 en teselas vectoriales. La determinante 19 sigue pendiente de verificar su correspondencia geométrica. Las cifras del navegador no son cifras oficiales.')
 write(PUBLIC/'entrega.json',{'fuente':'Corpoamazonia','anio_declarado':2022,'capas':delivered,'pendientes':[19],'decision_19':'Alejandro: publicar las otras doce y mantener 19 pendiente; ver issue #44','parametros':{'minzoom':5,'maxzoom':12,'extent':4096,'buffer':80,'simplification':1,'simplification_max_zoom':0,'max_size':100000000,'max_features':200000}})
 write(PUBLIC/'diccionario_campos.json',{'objectid':'Identificador de la determinante en el catálogo; no recuento de fragmentos.','fid_ronda':'Identificador original de Rondas_Hidricas.','Nombre':'Nombre literal de Determinantes_Ambientales_CAR, verificado por correspondencia WKB.','Norma_Asociada':'Referencia normativa literal del registro de determinantes. No acredita un acto individual de acotamiento.','Fuente':'Corpoamazonia, según autorización de publicación.','Anio':'2022, año de fuente declarado por Alejandro; no fecha acreditada por entidad.','Fuente_hidrica':'Atributo literal de Rondas_Hidricas.','Longitud_buffer':'Valor original del atributo (30). No se interpreta como ancho normativo verificado.'})
 write(ROOT/'catalogo_determinantes_para_geovisor.json',catalog);manifiesto();comprobar()

def comprobar():
 control=load(PUBLIC/'control_origen.json');delivery=load(PUBLIC/'entrega.json');rows=delivery['capas'];assert len(rows)==12 and {r['objectid'] for r in rows}==set(range(20,32)) and delivery['pendientes']==[19]
 assert {r['fid'] for r in control['registros'] if not r['valida_geos']}=={6,7,8,9}
 for r in control['reparaciones']:
  assert r['valida_despues'] and r['desplazamiento_max_vertices_m']==0 and r['diferencia_area_numerador']=='0'
  assert r['vertices_originales_ausentes']==0 and r['coordenadas_nuevas']==0 and r['vertices_unicos_antes']==r['vertices_unicos_despues']
 catalog=load(ROOT/'catalogo_determinantes_para_geovisor.json');cards={c['objectid']:c for g in catalog['grupos'] for c in g['capas']}
 assert not cards[19].get('archivoTeselas') and not cards[19]['archivo']
 assert {p.name for p in (PUBLIC/'teselas').glob('*.pmtiles')}=={f'determinante_{i}.pmtiles' for i in range(20,32)},'Archivos de teselas no autorizados'
 for row in rows:
  oid=row['objectid'];p=PUBLIC/'teselas'/f'determinante_{oid}.pmtiles';b=p.read_bytes();h=header(b)
  assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256']
  assert [h['minzoom'],h['maxzoom'],h['tile_type']]==[5,12,1]
  m=b[h['metadata_offset']:h['metadata_offset']+h['metadata_bytes']]
  if h['internal_compression']==2:m=gzip.decompress(m)
  layers=json.loads(m)['vector_layers'];assert len(layers)==1 and layers[0]['id']=='rondas'
  assert set(layers[0]['fields'])==set(load(PUBLIC/'diccionario_campos.json'))
  card=cards[oid];assert card['norma']==row['norma']=='Resolución 957 de 2018' and card['nombre']==row['nombre']=='Rondas hídricas' and card['estado']=='aprobada_disponible_teselas'
  assert card['archivoTeselas']==p.relative_to(ROOT).as_posix() and card['teselas']['sha256']==row['sha256']
 if (PUBLIC/'auditoria_teselas.json').exists():
  audit=load(PUBLIC/'auditoria_teselas.json')['capas'];assert {c['objectid'] for c in audit}==set(range(20,32))
  for row in rows:
   a=next(c for c in audit if c['objectid']==row['objectid']);assert a['sha256_pmtiles']==row['sha256'] and a['tesela_comprimida_max_bytes']<100000000
   assert [z['zoom'] for z in a['por_zoom']]==list(range(5,13)) and all(z['objectids']==[row['objectid']] for z in a['por_zoom'])
   if row['partes_lineales_conservadas']:assert a['por_zoom'][-1]['tipos_geometria'].get('2',0)>0
 expected={p.relative_to(PUBLIC).as_posix() for p in PUBLIC.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}
 lines=(PUBLIC/'SHA256SUMS').read_text().splitlines();assert len(lines)==len(expected) and {l.split('  ',1)[1] for l in lines}==expected
 for line in lines:
  sha,name=line.split('  ',1);p=(PUBLIC/name).resolve();assert p.is_relative_to(PUBLIC) and digest(p)==sha
 print('12 PMTiles verificados; correspondencia 20–31, reparaciones 0 m / 0 m² y 19 pendiente.')

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--fase',choices=['origen','copias','teselas','auditar-nativa','integrar','comprobar'],default='comprobar');parser.add_argument('--comprobar',action='store_true');parser.add_argument('--gdb',type=Path);parser.add_argument('--privado',type=Path);parser.add_argument('--gdal-library');parser.add_argument('--geos-library');args=parser.parse_args()
 try:
  if args.comprobar or args.fase=='comprobar':comprobar()
  else:
   if not args.privado:parser.error('Falta carpeta privada de análisis')
   private(args)
   if args.fase!='integrar' and not all([args.gdal_library,args.geos_library]):parser.error('Indique las bibliotecas GIS ya instaladas')
   if args.fase=='origen':
    if not args.gdb:parser.error('Falta fuente geodatabase')
    origen(args);correspondencia(args)
   elif args.fase=='copias':copias(args)
   elif args.fase=='teselas':teselas(args)
   elif args.fase=='auditar-nativa':auditar_nativa(args)
   elif args.fase=='integrar':integrar(args)
 except (ValueError,AssertionError,OSError,KeyError) as error:raise SystemExit('Rondas no publicadas: '+str(error))
