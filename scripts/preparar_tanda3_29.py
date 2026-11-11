#!/usr/bin/env python3
"""Entrega revisable de la tanda 3. Nunca abre ni modifica la geodatabase.

--entrada recibe copias privadas auditadas y reproyectadas con GDAL/PROJ.
Las huellas fijan exactamente esas copias; no acepta archivos arbitrarios.
--comprobar verifica la entrega pública sin disco externo ni dependencias GIS.
"""
import argparse,gzip,hashlib,json,math,unicodedata
from pathlib import Path
REPO=Path(__file__).resolve().parents[1]
OUT=REPO/'datos/tanda_3_29'
CONFIG={
 'equipamientos_publicos':{
  'original':'Sistema_EQUIPAMIENTOS','hash':'b910bd60e2a9f858685a30581be4c659a5140a742d18df29e35abe30de9e3f87',
  'ids':[94,95,*range(104,112),124,125,127,128,129,*range(130,140)],
  'campos':['NOMBRE','ESTADO','ESCALA','TIPO_EQUI','NIVEL'],
  'descripcion':['Nombre literal de la institución o instalación.','Estado literal; Sin Información no acredita operación actual.','Ámbito declarado en la fuente.','Tipo literal observado en la fuente; solo se incluyen los cinco tipos de la selección.','Nivel literal de la fuente; no implica habilitación o funcionamiento actual.'],
  'nombre':'Equipamientos identificables del POD','categoria':'Estructura funcional y de servicios','fuente':'Gobernación del Amazonas / DANE, ficha POD 125','anio':2022,'color':'#176d42',
  'restriccion':'Selección de 25 puntos identificables de 106 registros. Se excluyen 13 por precaución de sensibilidad y quedan 68 con nombres genéricos pendientes de identificación, incluidos 7 sin geometría. No acredita acceso público ni operación actual.',
  'tipos':{'Recreación y deporte':'#a34a06','Transporte':'#156f99','Cultura':'#764898','Administración':'#176d42','Salud':'#a32f50'}},
 'centros_poblados':{
  'original':'Centros_Poblados','hash':'3c0d3176a498359308bf1cce352d7d5f9e78b9e6a9152a1a285f7f9fd9251116','ids':list(range(1,12)),
  'campos':['COD_CPOB','NOM_CPOB','CATEGORIA','FUENTE'],
  'descripcion':['Código original, no único: hay duplicados, 99999999 y longitudes diferentes. No usar como clave de unión.','Nombre original de cabecera o asentamiento principal.','Categoría literal de la fuente.','Fuente y año literales por punto: DANE 2020 u OCHA Colombia 2010.'],
  'nombre':'Cabeceras y asentamientos principales del POD','categoria':'Base cartográfica','fuente':'DANE / OCHA Colombia, compilación POD','anio':'2010 / 2020; actualización POD 2022','color':'#156f99',
  'restriccion':'Once referencias de cabeceras o asentamientos principales; no es un inventario de comunidades. Códigos originales duplicados o provisionales: no sirven como clave única. Hay diferencias de fecha entre atributos, ficha y metadato; consulte FUENTE por punto. Ubicación de referencia, sin garantía de precisión actual.',
  'tipos':{'Asentamiento Principal':'#156f99','Cabecera Municipal':'#a34a06','Capital Departamental':'#176d42'}}}

def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf-8'))
def raw(obj):return (json.dumps(obj,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
def save(p,obj):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw(obj))
def check_point(f,fields):
 assert f['type']=='Feature' and set(f['properties'])==set(fields),'Campos distintos a la lista pública'
 geom=f['geometry'];assert geom['type']=='Point' and len(geom['coordinates'])==2,'Se requiere Point XY'
 x,y=geom['coordinates'];assert all(isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) for v in [x,y])
 assert -180<=x<=180 and -90<=y<=90
 text=unicodedata.normalize('NFKD',json.dumps(f['properties'],ensure_ascii=False)).encode('ascii','ignore').decode().lower()
 assert not any(t in text for t in ['aislamiento','aislados','piav']),'Requiere revisión institucional'

def preparar(entrada):
 entrada=entrada.resolve();assert not entrada.is_relative_to(REPO),'Las copias privadas deben estar fuera del repositorio'
 audit=load(entrada/'auditoria_privada.json');catalog=[];quality={};dictionary={}
 for key,cfg in CONFIG.items():
  b=(entrada/(cfg['original']+'.geojson')).read_bytes();assert sha(b)==cfg['hash'],'Copia privada distinta a la revisada'
  original=load(entrada/(cfg['original']+'.geojson'));selected=[f for f in original['features'] if f['id'] in cfg['ids']]
  assert [f['id'] for f in selected]==cfg['ids'],'Selección no coincide con la revisión'
  features=[]
  for f in selected:
   props={k:f['properties'][k] for k in cfg['campos']};out={**f,'properties':props};check_point(out,cfg['campos']);features.append(out)
  target=OUT/'capas'/(key+'.geojson');save(target,{'type':'FeatureCollection','features':features});b=target.read_bytes();gz=len(gzip.compress(b,compresslevel=6,mtime=0));assert len(b)<=1_000_000 and gz<=1_000_000
  counts={t:sum(f['properties']['TIPO_EQUI' if key=='equipamientos_publicos' else 'CATEGORIA']==t for f in features) for t in cfg['tipos']}
  assert all(counts.values()) and sum(counts.values())==len(features),'Tipos fuera de la selección revisada'
  catalog.append({'id_capa':key,'nombre_origen':cfg['original'],'nombre_publico':cfg['nombre'],'categoria':cfg['categoria'],'estado':'publicable','fuente_declarada_encargo':cfg['fuente'],'anio_declarado_encargo':cfg['anio'],'color':cfg['color'],'restricciones':cfg['restriccion'],'ruta_relativa':'capas/'+target.name,'entidades':len(features),'bytes':len(b),'bytes_gzip_6':gz,'sha256':sha(b),'src_salida':'OGC:CRS84','campos_publicos':cfg['campos'],'campo_leyenda':'TIPO_EQUI' if key=='equipamientos_publicos' else 'CATEGORIA','leyenda':[{'valor':t,'color':c,'entidades':counts[t]} for t,c in cfg['tipos'].items()]})
  a=audit[cfg['original']];quality[key]={'total_origen':a['total_origen'],'seleccion':len(features),'ids_publicados':cfg['ids'],'validez_geos_origen_y_salida':all(x[0] not in cfg['ids'] for x in a['invalidas']),'recorte':False,'simplificacion':False,'redondeo':False,'residuo_inverso_max_m_capa':a['residuo_inverso_m'],'huellas_wkb_nativas':[x for x in a['huellas_nativas'] if x[0] in cfg['ids']],'sha256_copia_auditada':cfg['hash'],'geometria_igual_a_copia_auditada':True,'atributos_publicos_iguales_a_copia_auditada':True}
  dictionary[key]=[{'origen':k,'ubicacion':'Feature.properties','publico':True,'descripcion':d} for k,d in zip(cfg['campos'],cfg['descripcion'])]
  dictionary[key].append({'origen':'id','ubicacion':'Feature.id','publico':True,'descripcion':'FID original de la entidad, no se deriva del código de centro.'})
 catalog+=load(OUT/'pendientes.json')
 save(OUT/'catalogo_entrega.json',catalog);save(OUT/'diccionario_campos.json',dictionary);save(OUT/'validacion.json',quality)
 manifiesto()

def manifiesto():
 files=sorted(p for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
 (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+p.relative_to(OUT).as_posix()+'\n' for p in files))
def comprobar():
 expected={p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}
 rows=[x.split('  ',1) for x in (OUT/'SHA256SUMS').read_text().splitlines()];assert len(rows)==len(expected) and {p for _,p in rows}==expected,'Manifiesto incompleto'
 for digest,name in rows:
  p=(OUT/name).resolve();assert p.is_relative_to(OUT) and p.is_file() and sha(p.read_bytes())==digest,'SHA-256 distinto: '+name
 catalog=load(OUT/'catalogo_entrega.json');assert len(catalog)==4
 assert {r['id_capa'] for r in catalog if r['estado']=='publicable'}==set(CONFIG)
 for row in catalog:
  if row['estado']!='publicable':assert row['ruta_relativa'] is None;continue
  cfg=CONFIG[row['id_capa']];p=OUT/'capas'/(row['id_capa']+'.geojson');b=p.read_bytes();data=json.loads(b)
  assert row['ruta_relativa']=='capas/'+p.name and row['bytes']==len(b) and row['sha256']==sha(b)
  assert len(b)<=1_000_000 and len(gzip.compress(b,compresslevel=6,mtime=0))<=1_000_000
  assert data['type']=='FeatureCollection' and 'crs' not in data
  assert [f['id'] for f in data['features']]==cfg['ids'] and len(data['features'])==row['entidades']
  for f in data['features']:check_point(f,cfg['campos'])
 print('Tanda 3: manifiesto, 36 puntos, campos públicos, XY y presupuesto correctos; 2 capas pendientes.')
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--entrada',type=Path);p.add_argument('--comprobar',action='store_true');args=p.parse_args()
 try:
  if args.comprobar:comprobar()
  elif args.entrada:preparar(args.entrada);comprobar()
  else:p.error('Indique --entrada o --comprobar')
 except (AssertionError,ValueError,KeyError,OSError) as error:raise SystemExit('Tanda 3 no válida: '+str(error))
