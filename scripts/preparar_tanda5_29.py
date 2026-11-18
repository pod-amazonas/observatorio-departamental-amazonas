#!/usr/bin/env python3
"""Tanda 5 #29: solo las dos fuentes con ficha y campos categóricos aprobados.
Sin dependencias GIS en la comprobación; originales abiertos exclusivamente en lectura.
"""
import argparse,ctypes as C,gzip,hashlib,json,math,os,shutil,sys,unicodedata
from pathlib import Path
from preparar_pmtiles40 import header
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'datos/tanda_5_29'
ENV={
 'amenaza_incendios_forestales':{'origen':'Amenaza_Incendios_Forestales','campos':['Nivel_Amenaza'],'nombre':'Amenaza por incendios forestales · 2010','fuente':'IDEAM','anio':2010,'ficha':'083','campo_leyenda':'Nivel_Amenaza','colores':{'Baja':'#a66b13','Muy Baja':'#55732b'},'ids':[1,2],'nota':'Cartografía estática de amenaza de 2010. No informa incendios activos, puntos de calor ni alertas actuales. No es un pronóstico ni un reporte en tiempo real.'},
 'amenaza_remocion_masa':{'origen':'Amenaza_Remocion_Masa','campos':['GRADO','CATEGORIA'],'nombre':'Amenaza por movimientos en masa · zonas estudiadas','fuente':'Servicio Geológico Colombiano (SGC)','anio':'2022 (fecha declarada en ficha POD 085)','ficha':'085','campo_leyenda':'GRADO','colores':{'Media':'#a34a06','Muy Baja':'#316f55'},'ids':list(range(1,139)),'nota':'Solo cubre las zonas estudiadas incluidas en la fuente. La ausencia de polígonos no implica ausencia de amenaza. No informa eventos ni alertas actuales.'}
}
FUENTES=[{'ficha': '083', 'archivo': '083_Amenaza_Incendios_Forestales.pdf', 'sha256': '0dfbcf4fb2ebdaf8b5645735fd21d915401c7c14fecb26130097773b69587902', 'fecha_declarada_en_ficha': 2010, 'nota': 'Fecha consignada por la ficha técnica POD; no equivale a actualización en tiempo real. No se publican el PDF ni datos de contacto.'}, {'ficha': '085', 'archivo': '085_Amenaza_Remocion_Masa.pdf', 'sha256': '3d059627983e3ab7180ff971a67b6b2061e40e1d5a0509369fb2ac93fc2817d1', 'fecha_declarada_en_ficha': 2022, 'nota': 'Fecha consignada por la ficha técnica POD; no equivale a actualización en tiempo real. No se publican el PDF ni datos de contacto.'}]
PENDIENTES=[
 {'origen':'Indice_Municipal_Riesgo','motivo':'La ficha 090 declara 2022 para la cartografía POD, pero no acredita año de referencia del índice, unidad/escala ni metodología de Indice_Ajustado. No se publica la tabla hasta confirmar con DNP; se unirá por código a la División, sin nuevas geometrías.'},
 {'origen':'Clasificacion_Suelo_Departamental','motivo':'La ficha 097 declara 2022 pero no identifica instrumento, acto y vigencia aplicable a cada clase. La compilación POD no acredita la adopción de un POT/EOT. Confirmar el instrumento y rotular propuesto solo cuando esa condición esté respaldada.'},
 {'origen':'Clasificacion_Suelo_Puerto_Nariño','motivo':'La ficha 098 declara 2022, sin instrumento, acto o vigencia acreditados. No se considera que un dato de adopción desconocido demuestre que sea propuesto. Retirada hasta confirmar el respaldo documental.'},
 {'origen':'Determinantes_OT','motivo':'La ficha 185 declara 2022 pero no acredita las normas y vigencia de los 25 registros; 12 categorías constan como N.D. Hay coincidencias temáticas por nombre con las determinantes ambientales publicadas. No se publican nuevos polígonos ni se duplica ninguna capa; falta cotejo documental de los temas restantes.'},
 {'origen':'Territorios_Colectivos','motivo':'Pendiente de revisión institucional de sensibilidad: no se puede confirmar ausencia de información que permita localizar pueblos en aislamiento voluntario. No se leyeron geometrías ni atributos de localización, ni se generaron mapas, centroides o derivados. Se requiere constancia de la entidad responsable antes de preparar esta fuente.'}
]

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
 for n,r,args in [('OSRGetLinearUnits',C.c_double,[P,C.POINTER(S)]),('OSRIsProjected',I,[P]),('OGR_L_GetLayerDefn',P,[P]),('GDALGetDriverByName',P,[S]),('GDALCreate',P,[P,S,I,I,I,I,P]),('GDALDatasetCreateLayer',P,[P,S,P,I,P]),('OGR_Fld_Create',P,[S,I]),('OGR_L_CreateField',I,[P,P,I]),('OGR_Fld_Destroy',None,[P]),('OGR_F_Create',P,[P]),('OGR_F_SetFieldString',None,[P,I,S]),('OGR_F_SetFieldDouble',None,[P,I,C.c_double]),('OGR_F_SetFieldInteger',None,[P,I,I]),('OGR_F_SetFID',I,[P,C.c_longlong]),('OGR_F_SetGeometry',I,[P,P]),('OGR_L_CreateFeature',I,[P,P]),('OGR_L_GetFeature',P,[P,C.c_longlong]),('OGR_G_GetEnvelope',None,[P,P]),('GDALVectorTranslateOptionsNew',P,[C.POINTER(S),P]),('GDALVectorTranslateOptionsFree',None,[P]),('GDALVectorTranslate',P,[S,P,I,C.POINTER(P),P,C.POINTER(I)]),('OGR_L_SetIgnoredFields',I,[P,C.POINTER(S)])]:f=getattr(g,n);f.restype=r;f.argtypes=args
 before=state();src=g.GDALOpenEx(os.fsencode(source),4,(S*2)(b'OpenFileGDB',None),None,None)
 if not src:raise ValueError('No se puede abrir la fuente en lectura')
 gpkg=private/'referencia_tanda5.gpkg'
 if gpkg.exists():raise ValueError('La referencia ya existe; no sobrescribir sin revisar')
 ds=g.GDALCreate(g.GDALGetDriverByName(b'GPKG'),os.fsencode(gpkg),0,0,0,0,None);assert ds
 reports=[];versions={'gdal':g.GDALVersionInfo(b'RELEASE_NAME').decode(),'geos':q.e.GEOSversion().decode()}
 repairs=[]
 try:
  for key,cfg in ENV.items():
   state();l=g.GDALDatasetGetLayerByName(src,cfg['origen'].encode());assert l;ref=g.OGR_L_GetSpatialRef(l)
   unit=S();assert g.OSRIsProjected(ref) and g.OSRGetLinearUnits(ref,C.byref(unit))==1,'El control 0 m/0 m² requiere fuente proyectada en metros'
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
      if not q.valid(geom):
       from reparar_drenaje40 import certificar,area_exacta
       g.OGR_G_MakeValidEx.restype=P;g.OGR_G_MakeValidEx.argtypes=[P,C.POINTER(S)]
       fixed=g.OGR_G_MakeValidEx(geom,(S*2)(b'METHOD=LINEWORK',None));assert fixed
       try:
        assert q.valid(fixed),'MakeValid no produjo geometría válida'
        original_json,changed=q.json(geom),q.json(fixed)
        proof=certificar(original_json,changed)
        delta=area_exacta(changed)-area_exacta(original_json)
        proof.update(id_capa=key,fid=fid,metodo='GEOS MakeValid LINEWORK en copia nativa',gdal=versions['gdal'],geos=versions['geos'],diferencia_area_numerador=str(delta.numerator),diferencia_area_denominador=str(delta.denominator),valida_despues=True)
        assert delta==0 and proof['desplazamiento_max_vertices_m']==0
        used=q.wkb(fixed);proof.update(sha256_wkb_original=original_hash,sha256_wkb_usada=sha(used));repairs.append(proof)
       finally:g.OGR_G_DestroyGeometry(fixed)
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
      from preparar_piloto_29 import geometry_info
      geometry_info(js,orient=True)
      # GeoJSON privado para medir la copia fiel; no se publica si supera 1 MB.
      features.append({'type':'Feature','id':fid,'properties':public,'geometry':js});env=(C.c_double*4)();g.OGR_G_GetEnvelope(shape,env);bounds.append([env[0],env[2],env[1],env[3]])
      recs.append({'fid':fid,'sha256_wkb_original':original_hash,'sha256_wkb_usada':sha(used),'sha256_atributos_publicos':sha(raw(public)),'valida_nativa':True,'valida_copia_crs84':True})
     finally:
      if shape:g.OGR_G_DestroyGeometry(shape)
      g.OGR_F_Destroy(f)
   finally:g.OCTDestroyCoordinateTransformation(trans);g.OSRDestroySpatialReference(geo)
   assert [r['fid'] for r in recs]==cfg['ids'],'Cambió el conjunto de entidades fuente'
   fc=raw({'type':'FeatureCollection','features':features});(private/f'{key}_fiel.geojson').write_bytes(fc)
   formato='pmtiles' if len(fc)>1000000 else 'geojson'
   bbox=[min(b[i] for b in bounds) if i<2 else max(b[i] for b in bounds) for i in range(4)]
   reports.append({'id_capa':key,'formato':formato,'registros':recs,'entidades':len(recs),'geojson_fiel_bytes':len(fc),'geojson_fiel_gzip6':len(gzip.compress(fc,compresslevel=6,mtime=0)),'bbox':bbox,'campos_publicos':[k for k,t in fields]})
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
   if row['formato']=='geojson':
    save(private/'entrega_geometrias.json',{'versiones':versions,'capas':reports,'reparaciones':repairs});continue
   dest=private/(row['id_capa']+'.pmtiles')
   if dest.exists():raise ValueError('Teselas ya existen; revisar antes de sobrescribir')
   args=['-f','PMTiles',row['id_capa'],'-nln',row['id_capa'],'-preserve_fid','-dsco','MINZOOM=5','-dsco','MAXZOOM=12','-dsco','EXTENT=4096','-dsco','BUFFER=80','-dsco','SIMPLIFICATION=1','-dsco','SIMPLIFICATION_MAX_ZOOM=0','-dsco','MAX_SIZE=100000000','-dsco','MAX_FEATURES=200000','-dsco','NAME='+ENV[row['id_capa']]['nombre'],'-dsco','DESCRIPTION=Copia autorizada en teselas; visualizacion, no superficies ni restricciones oficiales']
   opts=g.GDALVectorTranslateOptionsNew((S*(len(args)+1))(*(s.encode() for s in args),None),None);err=I()
   try:
    result=g.GDALVectorTranslate(os.fsencode(dest),None,1,(P*1)(ds),opts,C.byref(err));assert result and not err.value;g.GDALClose(result)
   finally:g.GDALVectorTranslateOptionsFree(opts)
   b=dest.read_bytes();row.update(bytes=len(b),sha256=sha(b),cabecera=header(b),origen_sin_cambios_metadata=True)
   save(private/'entrega_geometrias.json',{'versiones':versions,'capas':reports,'reparaciones':repairs});print('Teselas',row['id_capa'],len(b),flush=True)
 finally:g.GDALClose(ds)
 print('Preparación privada terminada; falta integración pública y auditoría.')


def integrate(private):
 native=load(private/'entrega_geometrias.json');catalog=[];dictionary={}
 for row in native['capas']:
  key=row['id_capa'];cfg=ENV[key];tiles=row['formato']=='pmtiles';src=private/(key+'.pmtiles' if tiles else key+'_fiel.geojson');b=src.read_bytes()
  target=OUT/('teselas' if tiles else 'capas')/(key+('.pmtiles' if tiles else '.geojson'));target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,target)
  reference=load(private/(key+'_fiel.geojson'));levels={k:sum(f['properties'][cfg['campo_leyenda']]==k for f in reference['features']) for k in cfg['colores']};assert sum(levels.values())==row['entidades']
  legend=[{'valor':v,'color':c,'entidades':levels[v]} for v,c in cfg['colores'].items()]
  item={'id_capa':key,'nombre_origen':cfg['origen'],'nombre_publico':cfg['nombre'],'categoria':'Gestión del riesgo','estado':'publicable','lote':5,'fuente_declarada_encargo':cfg['fuente'],'anio_declarado_encargo':cfg['anio'],'ficha':cfg['ficha'],'color':next(iter(cfg['colores'].values())),'restricciones':cfg['nota'],'advertencia':cfg['nota'],'ruta_relativa':target.relative_to(OUT).as_posix(),'entidades':row['entidades'],'bytes':len(b),'sha256':sha(b),'campos_publicos':row['campos_publicos'],'leyenda':legend,'campo_leyenda':cfg['campo_leyenda'],'vector_tiles':tiles,'id_vector':-29501-len(catalog)}
  if tiles:item['teselas']={'bytes':len(b),'sha256':sha(b),'bbox':row['bbox'],'minzoom':5,'maxzoom':12,'dataLayer':key,'clasificacion':{'campo':cfg['campo_leyenda'],'clases':legend}}
  catalog.append(item);dictionary[key]=[{'campo':'fid_origen','tipo':'entero','definicion':'FID fuente conservado, repetible entre fragmentos MVT.'}]+[{'campo':f,'tipo':'texto','unidad':'categoría textual de la fuente','definicion':'Clasificación literal de amenaza; no es un indicador numérico ni un evento actual.'} for f in cfg['campos']]
 save(OUT/'catalogo_entrega.json',catalog);save(OUT/'diccionario_campos.json',dictionary);save(OUT/'control_geometrias.json',native);save(OUT/'pendientes.json',PENDIENTES);save(OUT/'fuentes.json',FUENTES)
 save(OUT/'auditoria_teselas.json',audit(catalog,native));manifest()


def audit(catalog,control):
 from unificar_rondas46 import tiles,fields,feature,zoom
 reports=[]
 for row in catalog:
  if not row['vector_tiles']:continue
  key=row['id_capa'];original=next(r for r in control['capas'] if r['id_capa']==key);expected={r['fid']:r for r in original['registros']};byz={z:{'zoom':z,'ids':set(),'fragmentos':0} for z in range(5,13)}
  for tid,tile in tiles((OUT/row['ruta_relativa']).read_bytes()):
   layers=[v for n,w,v in fields(tile) if n==3 and w==2];assert len(layers)==1
   fs=list(fields(layers[0]));assert next(v.decode() for n,w,v in fs if n==1)==key
   keys=[v for n,w,v in fs if n==3];values=[v for n,w,v in fs if n==4]
   for f in [v for n,w,v in fs if n==2]:
    _,_,props,data,_=feature(f,keys,values);fid=props['fid_origen'];assert fid in expected and set(props).issubset(row['campos_publicos'])
    assert sha(raw({k:props.get(k) for k in row['campos_publicos']}))==expected[fid]['sha256_atributos_publicos'],'Cambió un atributo en MVT'
    r=byz[zoom(tid)];r['ids'].add(fid);r['fragmentos']+=1
  for z in byz.values():z['ids']=sorted(z['ids']);z['ids_no_visibles_por_generalizacion']=sorted(set(expected)-set(z['ids']))
  assert set(byz[12]['ids'])==set(expected),'Faltan entidades en el nivel de máximo detalle: revisar antes de publicar'
  reports.append({'id_capa':key,'sha256':row['sha256'],'atributos_publicos_sin_cambios':True,'por_zoom':list(byz.values()),'nota':'Fragmentos de visualización, no entidades completas. La cuantización puede omitir entidades pequeñas en niveles generales; todas deben aparecer en zoom 12.'})
 return reports


def check():
 files={p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS'};lines=(OUT/'SHA256SUMS').read_text().splitlines();assert len(lines)==len(files) and {l.split('  ',1)[1] for l in lines}==files
 for line in lines:
  digest,name=line.split('  ',1);p=(OUT/name).resolve();assert p.is_relative_to(OUT) and sha(p.read_bytes())==digest,'Manifiesto no coincide: '+name
 catalog=load(OUT/'catalogo_entrega.json');control=load(OUT/'control_geometrias.json');dictionary=load(OUT/'diccionario_campos.json');assert {r['id_capa'] for r in catalog}==set(ENV)==set(dictionary)
 allowed={'LEEME.md','catalogo_entrega.json','control_geometrias.json','diccionario_campos.json','pendientes.json','auditoria_teselas.json','fuentes.json'}|{r['ruta_relativa'] for r in catalog}
 assert files==allowed,'Archivo fuera del alcance autorizado de tanda 5'
 assert load(OUT/'pendientes.json')==PENDIENTES and load(OUT/'fuentes.json')==FUENTES
 assert {r['id_capa'] for r in control['capas']}==set(ENV)
 for row in catalog:
  key=row['id_capa'];cfg=ENV[key];p=OUT/row['ruta_relativa'];b=p.read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256']
  native=next(r for r in control['capas'] if r['id_capa']==key);assert [r['fid'] for r in native['registros']]==cfg['ids'] and row['entidades']==len(cfg['ids'])
  assert row['campos_publicos']==['fid_origen']+cfg['campos'] and row['anio_declarado_encargo']==cfg['anio'] and row['restricciones']==cfg['nota']
  assert all(r['valida_nativa'] and r['valida_copia_crs84'] and r['wkb_gpkg_identica'] for r in native['registros'])
  assert {l['valor']:l['color'] for l in row['leyenda']}==cfg['colores'] and sum(l['entidades'] for l in row['leyenda'])==row['entidades']
  if row['vector_tiles']:
   h=header(b);assert native['geojson_fiel_bytes']>1000000 and (h['minzoom'],h['maxzoom'],h['tile_type'])==(5,12,1)
   m=json.loads(gzip.decompress(b[h['metadata_offset']:h['metadata_offset']+h['metadata_bytes']]))['vector_layers'];assert len(m)==1 and m[0]['id']==key and set(m[0]['fields'])==set(row['campos_publicos'])
  else:
   from preparar_piloto_29 import geometry_info
   d=json.loads(b);assert len(b)<=1000000 and 'crs' not in d and [f['id'] for f in d['features']]==cfg['ids']
   for f in d['features']:assert set(f['properties'])==set(row['campos_publicos']);geometry_info(f['geometry'])
 for repair in control['reparaciones']:assert repair['valida_despues'] and repair['desplazamiento_max_vertices_m']==0 and repair['diferencia_area_numerador']=='0' and repair['segmentos_identicos_con_multiplicidad']
 assert audit(catalog,control)==load(OUT/'auditoria_teselas.json')
 print('Tanda 5: alcance, manifiesto, 140 entidades nativas, campos categóricos, leyendas y teselas verificados.')


if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fase',choices=['preparar','integrar','comprobar'],default='comprobar');p.add_argument('--privado',type=Path);p.add_argument('--gdb',type=Path);p.add_argument('--gdal-library');p.add_argument('--geos-library');a=p.parse_args()
 try:
  if a.fase=='preparar':
   if not all([a.privado,a.gdb,a.gdal_library,a.geos_library]):p.error('Faltan fuente, privado o bibliotecas existentes')
   prepare(a)
  elif a.fase=='integrar':
   if not a.privado or a.privado.resolve().is_relative_to(ROOT):p.error('Se requiere carpeta privada fuera del repositorio')
   integrate(a.privado.resolve());check()
  else:check()
 except (ValueError,AssertionError,KeyError,OSError) as e:raise SystemExit('Tanda 5 detenida: '+str(e))
