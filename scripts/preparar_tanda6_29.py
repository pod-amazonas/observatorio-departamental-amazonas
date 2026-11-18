#!/usr/bin/env python3
"""Tanda 6 #29. Lectura exclusiva de dos fuentes autorizadas; no instala nada.
--comprobar funciona sin GIS, disco externo ni conexiones de red.
"""
import argparse,collections,ctypes as C,gzip,hashlib,json,math,os,shutil,sys
from pathlib import Path
from preparar_pmtiles40 import header
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'datos/tanda_6_29'
CONFIG={
 'drenaje_sencillo':dict(origen='Drenaje_Sencillo',campos=['ESTADO_DRENAJE'],nombre='Drenaje sencillo · IGAC 2022',categoria='Base cartográfica',fuente='IGAC',anio=2022,ficha='019',licencia='CC BY 4.0',licencia_url='https://creativecommons.org/licenses/by/4.0/',respaldo='https://www.igac.gov.co/transparencia-y-acceso-a-la-informacion-publica/normograma/resolucion-616-de-2020',color='#156f99',entidades=65165,nota='Cartografía de drenajes de 2022. No es una ruta navegable certificada ni informa caudales, accesos o seguridad de navegación.'),
 'vias_y_caminos':dict(origen='Vias_y_Caminos',campos=['highway'],nombre='Vías y caminos · OpenStreetMap · compilación 2022',categoria='Estructura funcional y de servicios',fuente='OpenStreetMap',anio='2022 (compilación según ficha POD 127)',ficha='127',licencia='ODbL 1.0',licencia_url='https://opendatacommons.org/licenses/odbl/1-0/',respaldo='https://www.openstreetmap.org/copyright/es',color='#9a4d12',entidades=1811,nota='© colaboradores de OpenStreetMap. Compilación de 2022; no garantiza transitabilidad, acceso público, estado actual ni seguridad del recorrido.')
}
OMISIONES_Z12={'drenaje_sencillo':[136905,141693,162830,162960,163042,163111,163119,163286,403372,405720],'vias_y_caminos':[772]}
PENDIENTES=[
 {'origen':'Cobertura_Uso_Tierra_CLC','motivo':'SINCHI 2021 acreditado en ficha 041, pero licencia del producto suministrado a escala 1:100.000 sin confirmar. No se aplica por analogía la licencia del mapa 2024 ni de los productos 2021 a 1:25.000. No se generan ni publican teselas; al habilitarla deberá mostrar año, leyenda CLC y cobertura observada no equivale a uso permitido.','referencia':'https://siatac.co/coberturas-100k/'},
 {'origen':'BIC_Declarados','motivo':'La declaratoria del único bien coincide con el registro nacional (Res. 238 de 2008), pero falta confirmar licencia del punto suministrado y publicabilidad sin reserva/sensibilidad. No se exportan geometrías, direcciones ni localizaciones.'},
 {'origen':'Distribucion_de_Poblacion','motivo':'Ficha 140 fechada 2020 y descripción DANE 2022; año de referencia y licencia sin acreditar. El esquema contiene hogares, unidades finas y coordenadas. No se leyeron filas ni geometrías ni se generaron derivados. Solicitar totales autorizados por unidades amplias, con año, unidad y licencia, para unir por código a la División publicada.'}
]
def sha(b):return hashlib.sha256(b).hexdigest()
def raw(v):return (json.dumps(v,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
def load(p):return json.loads(Path(p).read_text(encoding='utf8'))
def save(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw(v))
def manifest():
 (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+p.relative_to(OUT).as_posix()+'\n' for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
def lines(js):
 assert js['type'] in ('LineString','MultiLineString'),'Representación no lineal'
 ll=[js['coordinates']] if js['type']=='LineString' else js['coordinates'];assert ll
 for line in ll:
  assert len(line)>=2
  for pos in line:assert len(pos)==2 and all(math.isfinite(x) for x in pos)
 return ll

def prepare(a):
 from preparar_piloto_29 import GIS
 q=GIS(a.gdal_library,a.geos_library);g=q.g;P,S,I,D=C.c_void_p,C.c_char_p,C.c_int,C.c_double
 source=a.gdb.resolve();private=a.privado.resolve()
 assert not private.is_relative_to(ROOT) and source!=private and not private.is_relative_to(source) and not any(p.suffix.lower()=='.gdb' for p in [private,*private.parents]),'Copias fuera del repositorio y la fuente'
 if not source.is_dir():raise SystemExit('Disco desconectado; detener sin reintentar')
 private.mkdir(parents=True,exist_ok=True)
 def state():
  if not source.is_dir():raise SystemExit('Disco desconectado; detener sin reintentar')
  return sha(raw(sorted((p.name,p.stat().st_size,p.stat().st_mtime_ns) for p in source.iterdir() if p.is_file())))
 before=state()
 defs=[('OSRIsProjected',I,[P]),('OSRGetLinearUnits',D,[P,C.POINTER(S)]),('CPLSetConfigOption',None,[S,S]),('OGR_G_HasCurveGeometry',I,[P,I]),('OGR_G_GetLinearGeometry',P,[P,D,P]),('OGR_G_GetEnvelope',None,[P,P]),('OGR_L_GetFeature',P,[P,C.c_longlong]),('OGR_L_GetLayerDefn',P,[P]),('GDALGetDriverByName',P,[S]),('GDALCreate',P,[P,S,I,I,I,I,P]),('GDALDatasetCreateLayer',P,[P,S,P,I,P]),('OGR_Fld_Create',P,[S,I]),('OGR_L_CreateField',I,[P,P,I]),('OGR_Fld_Destroy',None,[P]),('OGR_F_Create',P,[P]),('OGR_F_SetFieldInteger',None,[P,I,I]),('OGR_F_SetFieldString',None,[P,I,S]),('OGR_F_SetFID',I,[P,C.c_longlong]),('OGR_F_SetGeometry',I,[P,P]),('OGR_L_CreateFeature',I,[P,P]),('GDALVectorTranslateOptionsNew',P,[C.POINTER(S),P]),('GDALVectorTranslateOptionsFree',None,[P]),('GDALVectorTranslate',P,[S,P,I,C.POINTER(P),P,C.POINTER(I)])]
 for n,r,args in defs:f=getattr(g,n);f.restype=r;f.argtypes=args
 g.CPLSetConfigOption(b'OGR_ARC_MAX_GAP',b'25');g.CPLSetConfigOption(b'GDAL_NUM_THREADS',b'2')
 src=g.GDALOpenEx(os.fsencode(source),4,(S*2)(b'OpenFileGDB',None),None,None);assert src
 gpkg=private/'referencia_tanda6.gpkg';assert not gpkg.exists(),'No sobrescribir una referencia existente'
 ds=g.GDALCreate(g.GDALGetDriverByName(b'GPKG'),os.fsencode(gpkg),0,0,0,0,None);assert ds
 result={'versiones':{'gdal':g.GDALVersionInfo(b'RELEASE_NAME').decode(),'geos':q.e.GEOSversion().decode()},'fuente_sin_cambios':False,'reparaciones':[],'capas':[]}
 try:
  for key,c in CONFIG.items():
   state();layer=g.GDALDatasetGetLayerByName(src,c['origen'].encode());assert layer
   sr=g.OGR_L_GetSpatialRef(layer);unit=S();assert g.OSRIsProjected(sr) and g.OSRGetLinearUnits(sr,C.byref(unit))==1,'La referencia debe estar proyectada en metros';g.OSRSetAxisMappingStrategy(sr,0)
   target=g.OSRNewSpatialReference(None);assert g.OSRSetFromUserInput(target,b'OGC:CRS84')==0;g.OSRSetAxisMappingStrategy(target,0)
   forward=g.OCTNewCoordinateTransformation(sr,target);back=g.OCTNewCoordinateTransformation(target,sr);assert forward and back
   out=g.GDALDatasetCreateLayer(ds,key.encode(),sr,5,(S*2)(b'SPATIAL_INDEX=NO',None));assert out
   fields=['fid_origen']+c['campos']
   for i,n in enumerate(fields):fd=g.OGR_Fld_Create(n.encode(),0 if i==0 else 4);assert g.OGR_L_CreateField(out,fd,1)==0;g.OGR_Fld_Destroy(fd)
   recs=[];bbox=[180,90,-180,-90];curves=[];containers=[];residual=0.;vertices=0;parts=0
   faithful=private/(key+'_fiel.geojson');stream=faithful.open('wb');stream.write(b'{"type":"FeatureCollection","features":[')
   try:
    while True:
     if not source.is_dir():raise SystemExit('Disco desconectado; detener sin reintentar')
     f=g.OGR_L_GetNextFeature(layer)
     if not f:break
     flat=None
     try:
      fid=g.OGR_F_GetFID(f);definition=g.OGR_F_GetDefnRef(f);names=[g.OGR_Fld_GetNameRef(g.OGR_FD_GetFieldDefn(definition,i)).decode() for i in range(g.OGR_FD_GetFieldCount(definition))]
      props={'fid_origen':fid}
      for name in c['campos']:
       i=names.index(name);props[name]=g.OGR_F_GetFieldAsString(f,i).decode() if g.OGR_F_IsFieldSetAndNotNull(f,i) else None
      # Solamente categorías; no nombres, notas libres, accesos ni etiquetas OSM.
      text=raw(props).decode().lower();assert not any(t in text for t in ('aislamiento','aislados','piav')),'Revisión institucional necesaria'
      geom=g.OGR_F_GetGeometryRef(f);assert geom and not g.OGR_G_IsEmpty(geom),'Geometría vacía'
      assert not g.OGR_G_Is3D(geom) and not g.OGR_G_IsMeasured(geom),'No descartar dimensiones'
      original=q.wkb(geom)
      if g.OGR_G_HasCurveGeometry(geom,0):containers.append(fid)
      if g.OGR_G_HasCurveGeometry(geom,1):curves.append(fid)
      flat=g.OGR_G_GetLinearGeometry(geom,4,None);assert flat and q.valid(flat),'Geometría inválida: detener antes de adoptar reparación'
      native=q.json(flat);native_lines=lines(native);used=q.wkb(flat)
      of=g.OGR_F_Create(g.OGR_L_GetLayerDefn(out))
      try:
       assert g.OGR_F_SetFID(of,fid)==0;g.OGR_F_SetFieldInteger(of,0,fid)
       for i,n in enumerate(fields[1:],1):
        if props[n] is not None:g.OGR_F_SetFieldString(of,i,props[n].encode())
       assert g.OGR_F_SetGeometry(of,flat)==0 and g.OGR_L_CreateFeature(out,of)==0
      finally:g.OGR_F_Destroy(of)
      assert g.OGR_G_Transform(flat,forward)==0 and q.valid(flat);js=q.json(flat);ll=lines(js)
      for line in ll:
       for x,y in line:
        assert -180<=x<=180 and -90<=y<=90;bbox=[min(bbox[0],x),min(bbox[1],y),max(bbox[2],x),max(bbox[3],y)]
      vertices+=sum(map(len,ll));parts+=len(ll)
      if recs:stream.write(b',')
      stream.write(raw({'type':'Feature','id':fid,'properties':props,'geometry':js}).rstrip())
      assert g.OGR_G_Transform(flat,back)==0
      inverse=lines(q.json(flat));assert list(map(len,inverse))==list(map(len,native_lines))
      residual=max(residual,max(math.hypot(x[0]-y[0],x[1]-y[1]) for aa,bb in zip(native_lines,inverse) for x,y in zip(aa,bb)))
      recs.append({'fid':fid,'original':sha(original),'lineal':sha(used),'atributos':sha(raw(props)),'crs84':sha(raw(js))})
     finally:
      if flat:g.OGR_G_DestroyGeometry(flat)
      g.OGR_F_Destroy(f)
    stream.write(b']}\n')
   finally:stream.close();g.OCTDestroyCoordinateTransformation(forward);g.OCTDestroyCoordinateTransformation(back);g.OSRDestroySpatialReference(target)
   assert len(recs)==c['entidades'] and residual<.000001
   row={'id_capa':key,'registros':recs,'entidades':len(recs),'bbox':bbox,'vertices_lineales':vertices,'partes_lineales':parts,'curvas':curves,'contenedores_curvos':containers,'residuo_inversa_m':residual,'geojson_bytes':faithful.stat().st_size,'geojson_gzip6':len(gzip.compress(faithful.read_bytes(),compresslevel=6,mtime=0)),'minzoom':5,'maxzoom':12}
   result['capas'].append(row);print('Copia nativa válida',key,len(recs),'curvas',len(curves),'GeoJSON bytes',row['geojson_bytes'],flush=True)
 finally:g.GDALClose(ds);g.GDALClose(src)
 assert state()==before,'Cambió la fuente durante lectura';result['fuente_sin_cambios']=True
 ds=g.GDALOpenEx(os.fsencode(gpkg),4,None,None,None);assert ds
 try:
  for row in result['capas']:
   key=row['id_capa'];l=g.GDALDatasetGetLayerByName(ds,key.encode());assert l
   for r in row['registros']:
    f=g.OGR_L_GetFeature(l,r['fid']);assert f
    try:assert sha(q.wkb(g.OGR_F_GetGeometryRef(f)))==r['lineal']
    finally:g.OGR_F_Destroy(f)
   row['gpkg_wkb_identicas']=True
   dest=private/(key+'.pmtiles');assert not dest.exists()
   args=['-f','PMTiles',key,'-nln',key,'-preserve_fid','-dsco','MINZOOM=5','-dsco','MAXZOOM=12','-dsco','EXTENT=4096','-dsco','BUFFER=80','-dsco','SIMPLIFICATION=1','-dsco','SIMPLIFICATION_MAX_ZOOM=0','-dsco','MAX_SIZE=100000000','-dsco','MAX_FEATURES=200000','-dsco','NAME='+CONFIG[key]['nombre']]
   opts=g.GDALVectorTranslateOptionsNew((S*(len(args)+1))(*(s.encode() for s in args),None),None);err=I()
   try:
    translated=g.GDALVectorTranslate(os.fsencode(dest),None,1,(P*1)(ds),opts,C.byref(err));assert translated and not err.value;g.GDALClose(translated)
   finally:g.GDALVectorTranslateOptionsFree(opts)
   row.update(bytes=dest.stat().st_size,sha256=sha(dest.read_bytes()),cabecera=header(dest.read_bytes()));print('PMTiles',key,row['bytes'],flush=True)
   save(private/'entrega_geometrias.json',result)
 finally:g.GDALClose(ds)

def audit(catalog,control):
 from unificar_rondas46 import tiles,fields,feature,zoom
 reports=[]
 for row in catalog:
  key=row['id_capa'];original=next(r for r in control['capas'] if r['id_capa']==key);expected={r['fid']:r for r in original['registros']};byz={z:{'zoom':z,'ids':set(),'fragmentos':0} for z in range(5,13)}
  for tid,tile in tiles((OUT/row['ruta_relativa']).read_bytes()):
   layers=[v for n,w,v in fields(tile) if n==3 and w==2];assert len(layers)==1
   fs=list(fields(layers[0]));assert next(v.decode() for n,w,v in fs if n==1)==key
   keys=[v for n,w,v in fs if n==3];values=[v for n,w,v in fs if n==4]
   for f in [v for n,w,v in fs if n==2]:
    _,_,props,data,_=feature(f,keys,values);assert data[3]==2,'Geometría MVT no lineal'
    fid=props['fid_origen'];assert fid in expected and set(props).issubset(row['campos_publicos'])
    assert sha(raw({k:props.get(k) for k in row['campos_publicos']}))==expected[fid]['atributos'],'Cambió atributo público'
    r=byz[zoom(tid)];r['ids'].add(fid);r['fragmentos']+=1
  for r in byz.values():r['ids']=sorted(r['ids']);r['ids_no_visibles_por_generalizacion']=sorted(set(expected)-set(r['ids']))
  assert byz[12]['ids_no_visibles_por_generalizacion']==OMISIONES_Z12[key],'Cambió el conjunto no visible por cuantización a zoom 12: revisar'
  reports.append({'id_capa':key,'atributos_sin_cambios':True,'por_zoom':list(byz.values())})
 return reports

def integrate(private):
 control=load(private/'entrega_geometrias.json');catalog=[];dictionary={}
 for row in control['capas']:
  key=row['id_capa'];c=CONFIG[key];target=OUT/'teselas'/(key+'.pmtiles');target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(private/(key+'.pmtiles'),target)
  item={'id_capa':key,'nombre_origen':c['origen'],'nombre_publico':c['nombre'],'categoria':c['categoria'],'estado':'publicable','lote':6,'fuente_declarada_encargo':c['fuente'],'anio_declarado_encargo':c['anio'],'color':c['color'],'restricciones':c['nota'],'advertencia':c['nota'],'ruta_relativa':target.relative_to(OUT).as_posix(),'entidades':row['entidades'],'bytes':row['bytes'],'sha256':row['sha256'],'campos_publicos':['fid_origen']+c['campos'],'leyenda':[{'valor':'Drenajes lineales' if key=='drenaje_sencillo' else 'Vías y caminos de la fuente OSM (sin verificación actual)','color':c['color'],'entidades':row['entidades']}],'vector_tiles':True,'id_vector':-29601-len(catalog),'licencia':c['licencia'],'licencia_url':c['licencia_url'],'atribucion':'© colaboradores de OpenStreetMap' if key=='vias_y_caminos' else 'IGAC · cartografía básica 2022','atribucion_url':c['respaldo'],'teselas':{'bytes':row['bytes'],'sha256':row['sha256'],'bbox':row['bbox'],'minzoom':5,'maxzoom':12,'dataLayer':key}}
  if key=='vias_y_caminos':
   download=OUT/'descargas/vias_y_caminos.geojson.gz';download.parent.mkdir(parents=True,exist_ok=True);download.write_bytes(gzip.compress((private/(key+'_fiel.geojson')).read_bytes(),compresslevel=6,mtime=0))
   item['descarga_fiel']={'ruta_relativa':download.relative_to(OUT).as_posix(),'bytes':download.stat().st_size,'sha256':sha(download.read_bytes())}
  catalog.append(item);dictionary[key]=[{'campo':'fid_origen','tipo':'entero','definicion':'FID original; se repite entre fragmentos MVT.'}]+[{'campo':n,'tipo':'texto','unidad':'categoría textual literal de la fuente','definicion':'Código de estado de drenaje, sin catálogo de valores confirmado; no acredita navegabilidad.' if n=='ESTADO_DRENAJE' else 'Etiqueta highway original de OSM; no acredita acceso, transitabilidad o estado actual.'} for n in c['campos']]
 save(OUT/'catalogo_entrega.json',catalog);save(OUT/'diccionario_campos.json',dictionary);save(OUT/'control_geometrias.json',control);save(OUT/'pendientes.json',PENDIENTES)
 save(OUT/'fuentes.json',[{'origen':c['origen'],'ficha':c['ficha'],'sha256_ficha':{'019':'ee22afa82ab84bae6651d620a4a558c117aef85907178ba26cb10a3e5ca6611e','127':'5b19512aad21073a398aac3c9cd0576218e5badf67b6f2a3afd1eb781470aded'}[c['ficha']],'fuente':c['fuente'],'anio':c['anio'],'licencia':c['licencia'],'licencia_url':c['licencia_url'],'respaldo':c['respaldo']} for c in CONFIG.values()])
 save(OUT/'auditoria_teselas.json',audit(catalog,control));manifest()

def check():
 expected={'catalogo_entrega.json','diccionario_campos.json','control_geometrias.json','pendientes.json','fuentes.json','auditoria_teselas.json','LEEME.md','NOTICE-ODbL.md','descargas/vias_y_caminos.geojson.gz'}|{'teselas/'+k+'.pmtiles' for k in CONFIG}
 files={p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}
 assert files==expected,'Archivos fuera del alcance o faltantes'
 entries=(OUT/'SHA256SUMS').read_text().splitlines();assert len(entries)==len(files) and {x.split('  ',1)[1] for x in entries}==files
 for line in entries:
  digest,name=line.split('  ',1);p=(OUT/name).resolve();assert p.is_relative_to(OUT) and sha(p.read_bytes())==digest,'SHA-256 no coincide: '+name
 cat=load(OUT/'catalogo_entrega.json');control=load(OUT/'control_geometrias.json');assert {c['id_capa'] for c in cat}==set(CONFIG)==set(load(OUT/'diccionario_campos.json'))
 assert control['fuente_sin_cambios'] and control['reparaciones']==[]
 for item in cat:
  cfg=CONFIG[item['id_capa']];row=next(r for r in control['capas'] if r['id_capa']==item['id_capa']);b=(OUT/item['ruta_relativa']).read_bytes()
  assert row['gpkg_wkb_identicas'] and row['residuo_inversa_m']<.000001
  assert item['bytes']==len(b) and item['sha256']==sha(b) and header(b)==row['cabecera']
  assert item['entidades']==len(row['registros'])==len({r['fid'] for r in row['registros']})==cfg['entidades']
  assert item['campos_publicos']==['fid_origen']+cfg['campos'] and item['licencia']==cfg['licencia'] and item['restricciones']==cfg['nota']
  assert item['teselas']['minzoom']==5 and item['teselas']['maxzoom']==12
  allowed=set(row['contenedores_curvos']);assert all(r['original']==r['lineal'] or r['fid'] in allowed for r in row['registros'])
 roads=next(c for c in cat if c['id_capa']=='vias_y_caminos');download=roads['descarga_fiel'];b=(OUT/download['ruta_relativa']).read_bytes();assert sha(b)==download['sha256'] and len(b)==download['bytes']
 fc=json.loads(gzip.decompress(b));assert len(fc['features'])==CONFIG['vias_y_caminos']['entidades']
 records={r['fid']:r for r in next(r for r in control['capas'] if r['id_capa']=='vias_y_caminos')['registros']}
 for f in fc['features']:
  assert set(f['properties'])=={'fid_origen','highway'} and sha(raw(f['properties']))==records[f['id']]['atributos']
  assert sha(raw(f['geometry']))==records[f['id']]['crs84'];lines(f['geometry'])
 assert audit(cat,control)==load(OUT/'auditoria_teselas.json'),'Auditoría MVT alterada'
 assert load(OUT/'pendientes.json')==PENDIENTES
 print('Tanda 6: SHA-256, copia nativa, campos públicos, licencias y teselas comprobados.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--gdb',type=Path);p.add_argument('--privado',type=Path);p.add_argument('--integrar',type=Path);p.add_argument('--comprobar',action='store_true');p.add_argument('--gdal-library',default='/Applications/QGIS.app/Contents/Frameworks/libgdal.dylib');p.add_argument('--geos-library',default='/Applications/QGIS.app/Contents/Frameworks/libgeos_c.dylib');a=p.parse_args()
 if a.gdb:
  if not a.privado:p.error('--gdb requiere --privado')
  prepare(a)
 elif a.integrar:integrate(a.integrar.resolve())
 else:check()
