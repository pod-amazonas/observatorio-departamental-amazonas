#!/usr/bin/env python3
"""Tanda 4 #29. Fuentes en lectura, copias fuera del repo; --comprobar sin GIS."""
import argparse,ctypes as C,gzip,hashlib,json,math,os,shutil,sys,unicodedata
from pathlib import Path
from preparar_pmtiles40 import header
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'datos/tanda_4_29'
HUM_ORIG='267c16a326c23f4feebeed452c0811c9e9fbddc34b08578f07ede9a8bbade35a'
HUM_FIX='2c4ed9a701d7aec1c7ff16bd0eca6aeadea3553ae01674446b2f8ecc29a1d4a1'
AIR_IDS=[1,3,400,401,402,403,405,406]
AIR_WARNING='Ubicación aproximada: diferencias de 0,9–5,7 km respecto a referencias de Aerocivil. No sirve para localizar accesos, navegar ni confirmar operación, horarios o disponibilidad actual. No garantiza acceso público.'
ENV={
 'reserva_forestal_ley_2da':{'origen':'Reserva_Forestal_Ley_2da','campos':['id','nom_ley2','area_ha','res_zoni','fecha_ingr','fecha_reco'],'nombre':'Reservas forestales de Ley 2ª · ámbito nacional','fuente':'MADS-SIAC','anio':'2022 (compilación POD; crédito SIAC 2021)','color':'#83591c','norma':'Ley 2ª de 1959; zonificación según res_zoni','leyenda':'Reservas forestales nacionales; no equivale a la zonificación A/B','nota':'Siete reservas nacionales completas, sin recorte. Incluye la reserva Amazonas, que se extiende por varios departamentos. No certifica vigencia normativa ni restricciones prediales.'},
 'humedales':{'origen':'Humedales','campos':['Categoria','AREA_TOT'],'nombre':'Humedales · fuente por confirmar','fuente':'IAvH según encargo; metadato cita MADS','anio':'por confirmar (metadato cita 2018; compilación 2022)','color':'#116d87','norma':'No acredita una delimitación normativa','leyenda':'Humedales de la compilación POD','nota':'Atribución por confirmar: el encargo indica IAvH y el metadato cita MADS 2018. Copia reparada con MakeValid autorizada: 0 m y 0 m² de diferencia algebraica exacta. Sin recorte ni simplificación previa; no certifica límites ni superficies.'}}
SERV={'SISTEMA_POTABILIZACION':'Sistema de potabilización','ALCANTARILLADO':'Alcantarillado','SISTEMA_TTO_AGUAS_RESIDUALES':'Tratamiento de aguas residuales','ASEO':'Aseo','ELECTRICIDAD':'Electricidad','ORGANIZACION_PRESTACION_DE_SP':'Organización de la prestación','ACUEDUCTO_CONSTRUIDO':'Acueducto construido'}
TABLES={'estado_servicios_anm':{'origen':'Estado_ServPublicos_ANM','campos':SERV,'nombre':'Estado de servicios públicos en ANM','fuente':'Compilación POD Amazonas 2022; metadato cita Alcaldía de Leticia','categoria':'Estructura funcional y de servicios'}}

def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(Path(p).read_text(encoding='utf8'))
def raw(d):return (json.dumps(d,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw(d))
def scan(d):
 s=unicodedata.normalize('NFKD',json.dumps(d,ensure_ascii=False)).encode('ascii','ignore').decode().lower()
 if any(t in s for t in ['aislamiento','aislados','piav']):raise ValueError('Requiere revisión institucional antes de procesar geometría')
def manifest():
 files=sorted(p for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
 (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+p.relative_to(OUT).as_posix()+'\n' for p in files))

def prepare(a):
 from preparar_piloto_29 import GIS
 private=a.privado.resolve();source=a.gdb.resolve()
 if private.is_relative_to(ROOT) or any(p.suffix.lower()=='.gdb' for p in [private,*private.parents]):raise ValueError('Análisis fuera del repositorio y de la fuente')
 if not source.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
 private.mkdir(exist_ok=True,parents=True);q=GIS(a.gdal_library,a.geos_library);g=q.g;P,S,I=C.c_void_p,C.c_char_p,C.c_int
 def state():
  if not source.is_dir():raise SystemExit('Disco desconectado; detener sin reintentos')
  return sha(raw(sorted((p.name,p.stat().st_size,p.stat().st_mtime_ns) for p in source.iterdir() if p.is_file())))
 for n,r,args in [('OGR_L_GetLayerDefn',P,[P]),('GDALGetDriverByName',P,[S]),('GDALCreate',P,[P,S,I,I,I,I,P]),('GDALDatasetCreateLayer',P,[P,S,P,I,P]),('OGR_Fld_Create',P,[S,I]),('OGR_L_CreateField',I,[P,P,I]),('OGR_Fld_Destroy',None,[P]),('OGR_F_Create',P,[P]),('OGR_F_SetFieldString',None,[P,I,S]),('OGR_F_SetFieldDouble',None,[P,I,C.c_double]),('OGR_F_SetFieldInteger',None,[P,I,I]),('OGR_F_SetFID',I,[P,C.c_longlong]),('OGR_F_SetGeometry',I,[P,P]),('OGR_L_CreateFeature',I,[P,P]),('OGR_L_GetFeature',P,[P,C.c_longlong]),('OGR_G_GetEnvelope',None,[P,P]),('GDALVectorTranslateOptionsNew',P,[C.POINTER(S),P]),('GDALVectorTranslateOptionsFree',None,[P]),('GDALVectorTranslate',P,[S,P,I,C.POINTER(P),P,C.POINTER(I)]),('OGR_L_SetIgnoredFields',I,[P,C.POINTER(S)])]:f=getattr(g,n);f.restype=r;f.argtypes=args
 before=state();src=g.GDALOpenEx(os.fsencode(source),4,(S*2)(b'OpenFileGDB',None),None,None)
 if not src:raise ValueError('No se puede abrir la fuente en lectura')
 gpkg=private/'referencia_tanda4.gpkg'
 if gpkg.exists():raise ValueError('La referencia ya existe; no sobrescribir sin revisar')
 ds=g.GDALCreate(g.GDALGetDriverByName(b'GPKG'),os.fsencode(gpkg),0,0,0,0,None);assert ds
 reports=[];versions={'gdal':g.GDALVersionInfo(b'RELEASE_NAME').decode(),'geos':q.e.GEOSversion().decode()}
 repair=load(private/'evaluacion_humedales/resultado.json')
 assert repair['sha256_wkb_original']==HUM_ORIG and repair['sha256_wkb_evaluado']==HUM_FIX
 assert repair['diferencia_area_numerador']=='0' and repair['desplazamiento_max_vertices_m']==0 and repair['valida_despues'] and repair['segmentos_identicos_con_multiplicidad']
 try:
  for key,cfg in ENV.items():
   state();l=g.GDALDatasetGetLayerByName(src,cfg['origen'].encode());assert l;ref=g.OGR_L_GetSpatialRef(l)
   g.OSRSetAxisMappingStrategy(ref,0);geo=g.OSRNewSpatialReference(None);g.OSRSetFromUserInput(geo,b'OGC:CRS84');g.OSRSetAxisMappingStrategy(geo,0);trans=g.OCTNewCoordinateTransformation(ref,geo);assert trans
   out=g.GDALDatasetCreateLayer(ds,key.encode(),ref,0,(S*2)(b'SPATIAL_INDEX=NO',None));assert out
   definition=g.OGR_L_GetLayerDefn(l);names=[g.OGR_Fld_GetNameRef(g.OGR_FD_GetFieldDefn(definition,i)).decode() for i in range(g.OGR_FD_GetFieldCount(definition))]
   fields=[('fid_origen',0)]+[(k,2 if k in ('area_ha','AREA_TOT') else 4) for k in cfg['campos']]
   for n,t in fields:fd=g.OGR_Fld_Create(n.encode(),t);assert g.OGR_L_CreateField(out,fd,1)==0;g.OGR_Fld_Destroy(fd)
   recs=[];features=[];bounds=[]
   try:
    while True:
     state();f=g.OGR_L_GetNextFeature(l)
     if not f:break
     shape=None
     try:
      fid=g.OGR_F_GetFID(f);vals={}
      for k in cfg['campos']:
       i=names.index(k);vals[k]=None if not g.OGR_F_IsFieldSetAndNotNull(f,i) else g.OGR_F_GetFieldAsDouble(f,i) if k in ('area_ha','AREA_TOT') else g.OGR_F_GetFieldAsString(f,i).decode()
      scan(vals);geom=g.OGR_F_GetGeometryRef(f);assert geom and not g.OGR_G_IsEmpty(geom)
      assert not g.OGR_G_Is3D(geom) and not g.OGR_G_IsMeasured(geom),'Dimensión no autorizada; no descartar'
      original=q.wkb(geom);original_hash=sha(original);used=original
      if key=='humedales':
       assert fid==1 and original_hash==HUM_ORIG and not q.valid(geom)
       used=(private/'evaluacion_humedales/despues.wkb').read_bytes();assert sha(used)==HUM_FIX
      elif not q.valid(geom):raise ValueError('Nueva geometría inválida en reserva: requiere evaluación exacta 0 m/0 m² antes de adoptar')
      wkb=private/f'{key}_{fid}_usada.wkb';wkb.write_bytes(used)
      shape=P();assert g.OGR_G_CreateFromWkb(C.create_string_buffer(used),ref,C.byref(shape),len(used))==0 and q.valid(shape)
      public={'fid_origen':fid,**vals};of=g.OGR_F_Create(g.OGR_L_GetLayerDefn(out))
      try:
       assert g.OGR_F_SetFID(of,fid)==0
       for i,(n,t) in enumerate(fields):
        v=public[n]
        if v is None:continue
        if t==0:g.OGR_F_SetFieldInteger(of,i,v)
        elif t==2:g.OGR_F_SetFieldDouble(of,i,v)
        else:g.OGR_F_SetFieldString(of,i,str(v).encode())
       assert g.OGR_F_SetGeometry(of,shape)==0 and g.OGR_L_CreateFeature(out,of)==0
      finally:g.OGR_F_Destroy(of)
      assert g.OGR_G_Transform(shape,trans)==0;js=q.json(shape);assert q.valid(shape)
      # GeoJSON privado para medir la copia fiel; no se publica si supera 1 MB.
      features.append({'type':'Feature','id':fid,'properties':public,'geometry':js});env=(C.c_double*4)();g.OGR_G_GetEnvelope(shape,env);bounds.append([env[0],env[2],env[1],env[3]])
      recs.append({'fid':fid,'sha256_wkb_original':original_hash,'sha256_wkb_usada':sha(used),'sha256_atributos_publicos':sha(raw(public)),'valida_nativa':True,'valida_copia_crs84':True})
     finally:
      if shape:g.OGR_G_DestroyGeometry(shape)
      g.OGR_F_Destroy(f)
   finally:g.OCTDestroyCoordinateTransformation(trans);g.OSRDestroySpatialReference(geo)
   fc=raw({'type':'FeatureCollection','features':features});(private/f'{key}_fiel.geojson').write_bytes(fc)
   assert len(fc)>1000000,'Revisar formato: capa ligera no necesita teselas'
   bbox=[min(b[i] for b in bounds) if i<2 else max(b[i] for b in bounds) for i in range(4)]
   reports.append({'id_capa':key,'registros':recs,'entidades':len(recs),'geojson_fiel_bytes':len(fc),'geojson_fiel_gzip6':len(gzip.compress(fc,compresslevel=6,mtime=0)),'bbox':bbox,'campos_publicos':[k for k,t in fields]})
   print('Copia nativa validada',key,len(recs),'GeoJSON',len(fc),'bytes',flush=True)
 finally:g.GDALClose(ds);g.GDALClose(src)
 assert state()==before,'Cambió la fuente durante lectura'
 ds=g.GDALOpenEx(os.fsencode(gpkg),4,None,None,None);assert ds
 try:
  for row in reports:
   l=g.GDALDatasetGetLayerByName(ds,row['id_capa'].encode());assert l
   for r in row['registros']:
    f=g.OGR_L_GetFeature(l,r['fid']);assert f
    try:assert sha(q.wkb(g.OGR_F_GetGeometryRef(f)))==r['sha256_wkb_usada'] and q.valid(g.OGR_F_GetGeometryRef(f))
    finally:g.OGR_F_Destroy(f)
    r['wkb_gpkg_identica']=True
   dest=private/(row['id_capa']+'.pmtiles')
   if dest.exists():raise ValueError('Teselas ya existen; revisar antes de sobrescribir')
   args=['-f','PMTiles',row['id_capa'],'-nln',row['id_capa'],'-preserve_fid','-dsco','MINZOOM=5','-dsco','MAXZOOM=12','-dsco','EXTENT=4096','-dsco','BUFFER=80','-dsco','SIMPLIFICATION=1','-dsco','SIMPLIFICATION_MAX_ZOOM=0','-dsco','MAX_SIZE=100000000','-dsco','MAX_FEATURES=200000','-dsco','NAME='+ENV[row['id_capa']]['nombre'],'-dsco','DESCRIPTION=Copia autorizada en teselas; visualizacion, no superficies ni restricciones oficiales']
   opts=g.GDALVectorTranslateOptionsNew((S*(len(args)+1))(*(s.encode() for s in args),None),None);err=I()
   try:
    result=g.GDALVectorTranslate(os.fsencode(dest),None,1,(P*1)(ds),opts,C.byref(err));assert result and not err.value;g.GDALClose(result)
   finally:g.GDALVectorTranslateOptionsFree(opts)
   b=dest.read_bytes();row.update(bytes=len(b),sha256=sha(b),cabecera=header(b),origen_sin_cambios_metadata=True)
   save(private/'entrega_geometrias.json',{'versiones':versions,'capas':reports});print('Teselas',row['id_capa'],len(b),flush=True)
 finally:g.GDALClose(ds)
 print('Preparación privada terminada; falta integración pública y auditoría.')


def tables(private):
 attrs=load(private/'atributos_publicos_revision.json');base=load(ROOT/'datos/piloto_29/catalogo_entrega.json');division=next(r for r in base if r['id_capa']=='division_politico_administrativa');geo_path=ROOT/'datos/piloto_29'/division['ruta_relativa'];geo=load(geo_path);names={f['properties']['MpCodigo']:f['properties']['MpNombre'] for f in geo['features']};dictionary={}
 for key,cfg in TABLES.items():
  rows=attrs[cfg['origen']]['registros'];codes=[r['campos']['MpCodigo'] for r in rows];assert len(codes)==11 and set(codes)==set(names) and len(set(codes))==11
  indicators=[]
  for field,label in cfg['campos'].items():
   indicators.append({'campo':field,'nombre':label+' · '+field,'producto':label+' (identificación por confirmar)' if key!='estado_servicios_anm' else 'No aplica: servicio público','anio':'por confirmar','unidad':'categoría textual de la fuente' if key=='estado_servicios_anm' else 'por confirmar','definicion':'por confirmar','fuente':cfg['fuente'],'nombre_origen':cfg['origen']})
  municipalities=[]
  for r in rows:
   code=r['campos']['MpCodigo'];vals={f:r['campos'][f] for f in cfg['campos']};scan(vals)
   for v in vals.values():assert v is None or isinstance(v,(str,int,float)) and not isinstance(v,bool) and (not isinstance(v,float) or math.isfinite(v))
   municipalities.append({'codigo':code,'nombre':names[code],'valores':vals})
  data={'id_tabla':key,'nombre':cfg['nombre'],'geometria_base':geo_path.relative_to(ROOT).as_posix(),'sha256_geometria_base':sha(geo_path.read_bytes()),'nota':'Compilación POD 2022; año de observación y definiciones por confirmar. Se preservan cero, nulos y categorías. Solo totales territoriales, sin campos de subgrupos ni nuevas geometrías.','indicadores':indicators,'municipios':municipalities}
  save(OUT/'tablas'/f'{key}.json',data);assert len(raw(data))<1000000
  dictionary[key]=indicators
 return dictionary


def integrate(private):
 # Opción B de Alejandro: eliminar entregas previas de las tablas aplazadas.
 for key in ('produccion_agricola','produccion_pecuaria'):
  (OUT/'tablas'/f'{key}.json').unlink(missing_ok=True)
 native=load(private/'entrega_geometrias.json');catalog=[];dictionary=tables(private)
 for i,row in enumerate(native['capas']):
  key=row['id_capa'];cfg=ENV[key];src=private/(key+'.pmtiles');b=src.read_bytes();assert sha(b)==row['sha256']
  target=OUT/'teselas'/src.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,target)
  catalog.append({'id_capa':key,'nombre_origen':cfg['origen'],'nombre_publico':cfg['nombre'],'categoria':'Componente biofísico','estado':'publicable','lote':4,'fuente_declarada_encargo':cfg['fuente'],'anio_declarado_encargo':cfg['anio'],'color':cfg['color'],'restricciones':cfg['nota'],'advertencia':cfg['nota'],'ruta_relativa':'teselas/'+target.name,'entidades':row['entidades'],'bytes':len(b),'sha256':sha(b),'campos_publicos':row['campos_publicos'],'vector_tiles':True,'id_vector':-29401-i,'teselas':{'bytes':len(b),'sha256':sha(b),'bbox':row['bbox'],'minzoom':5,'maxzoom':12,'dataLayer':key},'norma':cfg['norma'],'leyenda':cfg['leyenda']})
  dictionary[key]=[{'campo':f,'definicion':'Valor original de '+cfg['origen']+'; no recalculado. Unidad por confirmar para áreas y fechas de incorporación no equivalentes a vigencia.'} for f in row['campos_publicos']]
 airport=load(private/'aeropuertos_revision_privada.json');rows=airport['intersectan_no_identificados_como_restringidos'];assert [r['fid'] for r in rows]==AIR_IDS
 features=[{'type':'Feature','id':r['fid'],'properties':{'NOMBRE_GEOGRAFICO':r['nombre'],'FECHA':r['fecha_atributo']},'geometry':r['geometria_crs84']} for r in rows]
 for f in features:scan(f['properties']);assert f['geometry']['type']=='Point' and len(f['geometry']['coordinates'])==2
 fc={'type':'FeatureCollection','features':features};target=OUT/'capas/aeropuertos_referencia.geojson';save(target,fc);b=target.read_bytes();assert len(b)<1000000
 catalog.append({'id_capa':'aeropuertos_referencia','nombre_origen':'Aeropuerto','nombre_publico':'Aeropuertos y pistas · ubicación aproximada','categoria':'Estructura funcional y de servicios','estado':'publicable','lote':4,'fuente_declarada_encargo':'IGAC, compilación POD','anio_declarado_encargo':2022,'color':'#793f86','restricciones':AIR_WARNING,'ruta_relativa':'capas/'+target.name,'entidades':len(features),'bytes':len(b),'bytes_gzip_6':len(gzip.compress(b,mtime=0)),'sha256':sha(b),'campos_publicos':['NOMBRE_GEOGRAFICO','FECHA'],'leyenda':[{'valor':'Referencia aérea aproximada; sin datos operativos','color':'#793f86','entidades':8}]})
 dictionary['aeropuertos_referencia']=[{'campo':'NOMBRE_GEOGRAFICO','definicion':'Nombre original IGAC; no acredita operación actual.'},{'campo':'FECHA','definicion':'Fecha literal del atributo de la cartografía; no fecha de verificación operacional.'},{'campo':'Feature.id','definicion':'FID original, preservado.'}]
 save(OUT/'catalogo_entrega.json',catalog);save(OUT/'diccionario_campos.json',dictionary)
 repair=load(private/'evaluacion_humedales/resultado.json');repair.update(adoptada=True,publicacion_autorizada=True,autorizacion='Alejandro: adoptar la copia con 0 m/0 m² y continuar tanda 4; documentar como #41')
 save(OUT/'reparacion_humedales.json',repair);save(OUT/'control_geometrias.json',native)
 save(OUT/'control_aeropuertos.json',{'fuente_registros':63,'ids_publicados':AIR_IDS,'departamento_codigo':'91','sha256_departamento_control':airport['sha256_departamento_control'],'registros':[{k:r[k] for k in ('fid','sha256_wkb_origen')} for r in rows],'comparacion_aip':load(private/'comparacion_aip_resumen.json'),'decision':'Alejandro autoriza copia fiel con aviso visible de ubicación aproximada; #48 sigue abierto. No se mueven coordenadas ni se publican instalaciones restringidas o datos de operación.'})
 save(OUT/'auditoria_teselas.json',audit_tiles(catalog,native));manifest()


def audit_tiles(catalog,control):
 # Decodificación protobuf/PMTiles de biblioteca estándar, sin GDAL en CI.
 from unificar_rondas46 import tiles,fields,feature,zoom
 reports=[]
 for row in catalog:
  if not row.get('vector_tiles'):continue
  key=row['id_capa'];source=next(r for r in control['capas'] if r['id_capa']==key);expected={r['fid']:r for r in source['registros']};byz={z:{'zoom':z,'ids':set(),'fragmentos':0,'tipos':{}} for z in range(5,13)}
  for tid,raw_tile in tiles((OUT/row['ruta_relativa']).read_bytes()):
   layers=[v for n,w,v in fields(raw_tile) if n==3 and w==2];assert len(layers)==1
   flds=list(fields(layers[0]));assert next(v.decode() for n,w,v in flds if n==1)==key
   keys=[v for n,w,v in flds if n==3];values=[v for n,w,v in flds if n==4]
   for f in [v for n,w,v in flds if n==2]:
    _,_,props,data,_=feature(f,keys,values);fid=props['fid_origen'];assert fid in expected
    original={k:float(props[k]) if k in ('area_ha','AREA_TOT') and props.get(k) is not None else props.get(k) for k in row['campos_publicos']}
    assert set(props).issubset(set(original)) and sha(raw(original))==expected[fid]['sha256_atributos_publicos'],'Cambió atributo en teselas'
    z=byz[zoom(tid)];z['ids'].add(fid);z['fragmentos']+=1;t=str(data[3]);z['tipos'][t]=z['tipos'].get(t,0)+1
  for z in byz.values():z['ids']=sorted(z['ids']);assert z['ids']==sorted(expected),'Falta entidad en nivel de zoom'
  reports.append({'id_capa':key,'sha256':row['sha256'],'atributos_publicos_sin_cambios':True,'por_zoom':list(byz.values()),'nota':'Fragmentos por zoom, no entidades completas. Se mantiene la cuantización del método #41; no se usan para superficies.'})
 return reports


def check():
 expected={p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS'};lines=(OUT/'SHA256SUMS').read_text().splitlines();assert len(lines)==len(expected) and {l.split('  ',1)[1] for l in lines}==expected
 for line in lines:
  digest,name=line.split('  ',1);p=(OUT/name).resolve();assert p.is_relative_to(OUT) and sha(p.read_bytes())==digest
 catalog=load(OUT/'catalogo_entrega.json');assert {r['id_capa'] for r in catalog}==set(ENV)|{'aeropuertos_referencia'}
 control=load(OUT/'control_geometrias.json');assert {r['id_capa']:r['entidades'] for r in control['capas']}=={'reserva_forestal_ley_2da':7,'humedales':1}
 for row in catalog:
  p=OUT/row['ruta_relativa'];b=p.read_bytes();assert row['sha256']==sha(b) and row['bytes']==len(b)
  if row.get('vector_tiles'):
   h=header(b);assert (h['minzoom'],h['maxzoom'],h['tile_type'])==(5,12,1)
   meta=json.loads(gzip.decompress(b[h['metadata_offset']:h['metadata_offset']+h['metadata_bytes']]))['vector_layers'];assert len(meta)==1 and meta[0]['id']==row['id_capa']
   assert set(meta[0]['fields'])==set(row['campos_publicos'])
   r=next(r for r in control['capas'] if r['id_capa']==row['id_capa']);assert all(x['valida_nativa'] and x['valida_copia_crs84'] and x['wkb_gpkg_identica'] for x in r['registros'])
  else:
   d=json.loads(b);assert len(b)<1000000 and [f['id'] for f in d['features']]==AIR_IDS and 'crs' not in d
   assert all(set(f['properties'])==set(row['campos_publicos']) and f['geometry']['type']=='Point' for f in d['features'])
 audit=audit_tiles(catalog,control);assert audit==load(OUT/'auditoria_teselas.json'),'Auditoría de teselas distinta'
 assert {p.stem for p in (OUT/'tablas').glob('*.json')}==set(TABLES),'Hay tablas fuera del alcance autorizado'
 assert set(load(OUT/'diccionario_campos.json'))==set(TABLES)|set(ENV)|{'aeropuertos_referencia'},'Diccionario fuera del alcance autorizado'
 rep=load(OUT/'reparacion_humedales.json');assert rep['sha256_wkb_original']==HUM_ORIG and rep['sha256_wkb_evaluado']==HUM_FIX and rep['adoptada'] and rep['valida_despues'] and rep['diferencia_area_numerador']=='0' and rep['desplazamiento_max_vertices_m']==0 and rep['segmentos_identicos_con_multiplicidad']
 for key,cfg in TABLES.items():
  d=load(OUT/'tablas'/f'{key}.json');geometry=ROOT/d['geometria_base'];assert sha(geometry.read_bytes())==d['sha256_geometria_base']
  codes={f['properties']['MpCodigo'] for f in load(geometry)['features']};assert len(d['municipios'])==11 and {r['codigo'] for r in d['municipios']}==codes
  assert len(raw(d))<1000000 and {f['campo'] for f in d['indicadores']}==set(cfg['campos'])
  for row in d['municipios']:assert set(row)=={'codigo','nombre','valores'} and set(row['valores'])==set(cfg['campos'])
 print('Tanda 4: manifiesto, geometrías nativas, reparación 0/0, ocho puntos fieles y tabla categórica de servicios por código verificados.')

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fase',choices=['preparar','integrar','comprobar'],default='comprobar');p.add_argument('--privado',type=Path);p.add_argument('--gdb',type=Path);p.add_argument('--gdal-library');p.add_argument('--geos-library');a=p.parse_args()
 try:
  if a.fase=='preparar':
   if not all([a.privado,a.gdb,a.gdal_library,a.geos_library]):p.error('Faltan fuente, privado o bibliotecas existentes')
   prepare(a)
  elif a.fase=='integrar':
   if not a.privado or a.privado.resolve().is_relative_to(ROOT):p.error('Indique análisis privado fuera del repositorio')
   integrate(a.privado.resolve());check()
  else:check()
 except (ValueError,AssertionError,KeyError,OSError) as e:raise SystemExit('Tanda 4 detenida: '+str(e))
