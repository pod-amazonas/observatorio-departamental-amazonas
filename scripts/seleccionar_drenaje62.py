#!/usr/bin/env python3
"""Selecciona entidades completas desde la copia nativa auditada de Drenaje Sencillo.
La selección requiere las bibliotecas GIS de QGIS; no instala herramientas.
No abre ni modifica la geodatabase original. No recorta ni repara geometrías.
"""
import argparse,ctypes as C,copy,json,os,shutil
from pathlib import Path
import preparar_tanda6_29 as base
from preparar_pmtiles40 import header

BASELINE_SHA='2d63e63a6a178d99c45fe0c7b01e8b92bf058e33ffde823247c4f0baef97375d'
KEY='drenaje_sencillo'
RECORDS_SHA='695b9927902449c4cf6d1482846be6496ec2bb5541ebc966c21ab3151cc05bf5'

def comprobar_seleccion(row):
 s=row['seleccion'];assert s['sha256_control_original']==BASELINE_SHA
 assert s['sha256_departamento']==base.sha((base.ROOT/'datos/tanda_1_29/capas/departamento_amazonas.geojson').read_bytes())
 assert s['entidades_antes']==65165 and s['entidades_despues']==row['entidades']==27341 and s['entidades_excluidas']==37824
 assert s['wkb_seleccion_identico'] is True and s['desplazamiento_m']==0 and s['reparaciones']==[]
 assert base.sha(base.raw(row['registros']))==RECORDS_SHA,'Cambió el conjunto seleccionado o sus geometrías/atributos'

def integrar(private):
 private=private.resolve();assert not private.is_relative_to(base.ROOT)
 row=base.load(private/'seleccion.json');comprobar_seleccion(row)
 b=(private/(KEY+'.pmtiles')).read_bytes();assert base.sha(b)==row['sha256'] and len(b)==row['bytes']
 control=base.load(base.OUT/'control_geometrias.json');control['capas']=[row if r['id_capa']==KEY else r for r in control['capas']]
 cat=base.load(base.OUT/'catalogo_entrega.json');item=next(c for c in cat if c['id_capa']==KEY)
 item.update(entidades=row['entidades'],bytes=row['bytes'],sha256=row['sha256'],advertencia=base.CONFIG[KEY]['nota'],restricciones=base.CONFIG[KEY]['nota'])
 item['teselas'].update(bytes=row['bytes'],sha256=row['sha256'],bbox=row['bbox']);item['leyenda'][0]['entidades']=row['entidades']
 shutil.copyfile(private/(KEY+'.pmtiles'),base.OUT/item['ruta_relativa'])
 base.save(base.OUT/'control_geometrias.json',control);base.save(base.OUT/'catalogo_entrega.json',cat)
 base.save(base.OUT/'auditoria_teselas.json',base.audit(cat,control));base.manifest();base.check()

def preparar(a):
 from preparar_piloto_29 import GIS
 source=a.referencia.resolve();out=a.salida.resolve()
 assert source.is_file() and not source.is_relative_to(base.ROOT)
 assert not out.is_relative_to(base.ROOT) and not out.exists(),'Salida privada nueva, fuera del repositorio'
 control=a.control.read_bytes();assert base.sha(control)==BASELINE_SHA,'No es el control publicado original'
 old=json.loads(control);row=next(r for r in old['capas'] if r['id_capa']==KEY)
 expected={r['fid']:r for r in row['registros']};assert len(expected)==65165
 department=base.ROOT/'datos/tanda_1_29/capas/departamento_amazonas.geojson'
 dep=base.load(department)['features'];assert len(dep)==1 and str(dep[0]['properties']['DeCodigo'])=='91'
 source_sha=base.sha(source.read_bytes());out.mkdir(parents=True)
 q=GIS(a.gdal_library,a.geos_library);g,e=q.g,q.e;P,S,I=C.c_void_p,C.c_char_p,C.c_int
 defs=[('OGR_L_GetFeature',P,[P,C.c_longlong]),('OGR_G_GetEnvelope',None,[P,P]),('GDALVectorTranslateOptionsNew',P,[C.POINTER(S),P]),('GDALVectorTranslateOptionsFree',None,[P]),('GDALVectorTranslate',P,[S,P,I,C.POINTER(P),P,C.POINTER(I)])]
 for n,r,args in defs:f=getattr(g,n);f.restype=r;f.argtypes=args
 e.GEOSIntersects.restype=C.c_byte;e.GEOSIntersects.argtypes=[P,P]
 def translate(src,dest,args):
  opts=g.GDALVectorTranslateOptionsNew((S*(len(args)+1))(*(s.encode() for s in args),None),None);err=I()
  assert opts
  try:
   ds=g.GDALVectorTranslate(os.fsencode(dest),None,1,(P*1)(src),opts,C.byref(err));assert ds and not err.value;g.GDALClose(ds)
  finally:g.GDALVectorTranslateOptionsFree(opts)
 src=g.GDALOpenEx(os.fsencode(source),4,None,None,None);assert src
 selected=[];seen=set()
 try:
  layer=g.GDALDatasetGetLayerByName(src,KEY.encode());assert layer
  sr=g.OGR_L_GetSpatialRef(layer);g.OSRSetAxisMappingStrategy(sr,0)
  crs=g.OSRNewSpatialReference(None);assert g.OSRSetFromUserInput(crs,b'OGC:CRS84')==0;g.OSRSetAxisMappingStrategy(crs,0)
  back=g.OCTNewCoordinateTransformation(crs,sr);forward=g.OCTNewCoordinateTransformation(sr,crs);assert back and forward
  dg=g.OGR_G_CreateGeometryFromJson(base.raw(dep[0]['geometry']));assert dg and g.OGR_G_Transform(dg,back)==0
  db=q.wkb(dg);dp=e.GEOSWKBReader_read(q.reader,C.create_string_buffer(db),len(db));assert dp;g.OGR_G_DestroyGeometry(dg)
  try:
   while True:
    f=g.OGR_L_GetNextFeature(layer)
    if not f:break
    try:
     fid=g.OGR_F_GetFID(f);assert fid in expected and fid not in seen;seen.add(fid)
     assert g.OGR_F_GetFieldAsInteger64(f,0)==fid
     props={'fid_origen':fid,'ESTADO_DRENAJE':g.OGR_F_GetFieldAsString(f,1).decode() if g.OGR_F_IsFieldSetAndNotNull(f,1) else None}
     assert base.sha(base.raw(props))==expected[fid]['atributos'],'Cambió un atributo de la copia nativa'
     geom=g.OGR_F_GetGeometryRef(f);wkb=q.wkb(geom);assert base.sha(wkb)==expected[fid]['lineal'],'Cambió la copia nativa'
     p=e.GEOSWKBReader_read(q.reader,C.create_string_buffer(wkb),len(wkb));assert p
     try:
      hit=e.GEOSIntersects(p,dp);assert hit in (0,1)
      if hit:assert e.GEOSisValid(p)==1;selected.append(fid)
     finally:e.GEOSGeom_destroy(p)
    finally:g.OGR_F_Destroy(f)
  finally:e.GEOSGeom_destroy(dp);g.OCTDestroyCoordinateTransformation(back)
  assert seen==set(expected);selected.sort();assert 0<len(selected)<len(expected)
  gpkg=out/'seleccion.gpkg'
  translate(src,gpkg,['-f','GPKG',KEY,'-nln',KEY,'-preserve_fid','-where','fid_origen IN ('+','.join(map(str,selected))+')'])
 finally:g.GDALClose(src)
 bbox=[180,90,-180,-90];vertices=parts=0;verified=set();selected_set=set(selected)
 ds=g.GDALOpenEx(os.fsencode(gpkg),4,None,None,None);assert ds
 try:
  l=g.GDALDatasetGetLayerByName(ds,KEY.encode())
  while True:
   f=g.OGR_L_GetNextFeature(l)
   if not f:break
   try:
    fid=g.OGR_F_GetFID(f);assert fid in selected_set and fid not in verified;verified.add(fid)
    geom=g.OGR_F_GetGeometryRef(f);assert base.sha(q.wkb(geom))==expected[fid]['lineal'],'No se permiten cambios geométricos'
    assert g.OGR_G_Transform(geom,forward)==0;js=q.json(geom);assert base.sha(base.raw(js))==expected[fid]['crs84']
    ll=base.lines(js);parts+=len(ll);vertices+=sum(map(len,ll))
    for line in ll:
     for x,y in line:bbox=[min(bbox[0],x),min(bbox[1],y),max(bbox[2],x),max(bbox[3],y)]
   finally:g.OGR_F_Destroy(f)
  assert verified==set(selected)
 finally:g.GDALClose(ds);g.OCTDestroyCoordinateTransformation(forward);g.OSRDestroySpatialReference(crs)
 ds=g.GDALOpenEx(os.fsencode(gpkg),4,None,None,None);assert ds
 try:
  dest=out/(KEY+'.pmtiles')
  translate(ds,dest,['-f','PMTiles',KEY,'-nln',KEY,'-preserve_fid','-dsco','MINZOOM=5','-dsco','MAXZOOM=12','-dsco','EXTENT=4096','-dsco','BUFFER=80','-dsco','SIMPLIFICATION=1','-dsco','SIMPLIFICATION_MAX_ZOOM=0','-dsco','MAX_SIZE=100000000','-dsco','MAX_FEATURES=200000','-dsco','NAME='+base.CONFIG[KEY]['nombre']])
 finally:g.GDALClose(ds)
 assert base.sha(source.read_bytes())==source_sha,'Se modificó la referencia de lectura'
 result=copy.deepcopy(row);result.update(registros=[expected[i] for i in selected],entidades=len(selected),bbox=bbox,vertices_lineales=vertices,partes_lineales=parts,curvas=[i for i in row['curvas'] if i in verified],contenedores_curvos=[i for i in row['contenedores_curvos'] if i in verified],bytes=dest.stat().st_size,sha256=base.sha(dest.read_bytes()),cabecera=header(dest.read_bytes()))
 # Las métricas de GeoJSON completo no describen esta selección; no se publican.
 result.pop('geojson_bytes');result.pop('geojson_gzip6')
 result['seleccion']={'criterio':'Intersects en el CRS nativo con departamento_amazonas, DeCodigo 91; incluye contactos con el borde. Entidades completas, sin recortes.','sha256_departamento':base.sha(department.read_bytes()),'sha256_control_original':BASELINE_SHA,'sha256_referencia_nativa':source_sha,'entidades_antes':65165,'entidades_despues':len(selected),'entidades_excluidas':65165-len(selected),'wkb_seleccion_identico':True,'desplazamiento_m':0,'reparaciones':[],'versiones':{'gdal':g.GDALVersionInfo(b'RELEASE_NAME').decode(),'geos':e.GEOSversion().decode()}}
 base.save(out/'seleccion.json',result)
 print('Seleccionadas',len(selected),'de 65165; PMTiles',dest.stat().st_size,'bytes',flush=True)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--referencia',type=Path);p.add_argument('--control',type=Path);p.add_argument('--salida',type=Path);p.add_argument('--integrar',type=Path);p.add_argument('--gdal-library',default='/Applications/QGIS.app/Contents/Frameworks/libgdal.dylib');p.add_argument('--geos-library',default='/Applications/QGIS.app/Contents/Frameworks/libgeos_c.dylib');a=p.parse_args()
 if a.integrar:integrar(a.integrar)
 elif a.referencia and a.control and a.salida:preparar(a)
 else:p.error('Se requiere --integrar o --referencia, --control y --salida')
