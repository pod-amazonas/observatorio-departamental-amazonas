#!/usr/bin/env python3
"""Ensayos internos de simplificación. Nunca sustituye la entrega fiel.

Lee únicamente las copias técnicas del preparador, con sus huellas. Los GeoJSON
experimentales deben quedar fuera del repositorio; el informe solo contiene
métricas y hashes. Los parámetros probados NO son una aprobación de adopción.
"""
import argparse
import ctypes as C
import gzip
import json
from pathlib import Path
from preparar_piloto_29 import GIS, CONFIG, REPO, digest, geometry_info, load, write


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--interno',type=Path,required=True)
 parser.add_argument('--candidatos',type=Path,required=True)
 parser.add_argument('--informe',type=Path,required=True)
 parser.add_argument('--gdal-library',required=True);parser.add_argument('--geos-library',required=True)
 args=parser.parse_args()
 internal=args.interno.resolve();output=args.candidatos.resolve()
 if internal.is_relative_to(REPO) or output.is_relative_to(REPO) or output==internal or output.is_relative_to(internal):raise ValueError('Copias internas y candidatos separados, fuera del repositorio')
 gis=GIS(args.gdal_library,args.geos_library);g,e=gis.g,gis.e
 P,D,I=C.c_void_p,C.c_double,C.c_int
 functions=[('GEOSGeom_clone',P,[P]),('GEOSGeom_createCollection',P,[I,C.POINTER(P),C.c_uint]),('GEOSCoverageIsValid',I,[P,D,C.POINTER(P)]),('GEOSCoverageSimplifyVW',P,[P,D,I]),('GEOSTopologyPreserveSimplify',P,[P,D]),('GEOSWKBWriter_create',P,[]),('GEOSWKBWriter_write',P,[P,P,C.POINTER(C.c_size_t)]),('GEOSFree',None,[P]),('GEOSGetNumGeometries',I,[P]),('GEOSGetGeometryN',P,[P,I]),('GEOSGeomTypeId',I,[P]),('GEOSGetNumInteriorRings',I,[P]),('GEOSArea',I,[P,C.POINTER(D)]),('GEOSSymDifference',P,[P,P]),('GEOSBoundary',P,[P]),('GEOSHausdorffDistance',I,[P,P,C.POINTER(D)]),('GEOSisEmpty',C.c_byte,[P])]
 for name,result,params in functions:
  f=getattr(e,name);f.restype=result;f.argtypes=params
 writer=e.GEOSWKBWriter_create()
 def geos(b):
  p=e.GEOSWKBReader_read(gis.reader,C.create_string_buffer(b),len(b))
  if not p:raise ValueError('No se pudo leer WKB')
  return p
 def dump(p):
  n=C.c_size_t();buf=e.GEOSWKBWriter_write(writer,p,C.byref(n))
  if not buf:raise ValueError('No se pudo escribir WKB')
  b=C.string_at(buf,n.value);e.GEOSFree(buf);return b
 def area(p):
  v=D()
  if e.GEOSArea(p,C.byref(v))!=1:raise ValueError('Error de área')
  return v.value
 def counts(p):
  parts=[p] if e.GEOSGeomTypeId(p)==3 else [e.GEOSGetGeometryN(p,i) for i in range(e.GEOSGetNumGeometries(p))]
  return (len(parts),sum(1+e.GEOSGetNumInteriorRings(q) for q in parts))
 def collection(polys):
  arr=(P*len(polys))(*(e.GEOSGeom_clone(p) for p in polys))
  result=e.GEOSGeom_createCollection(7,arr,len(polys))
  if not result:raise ValueError('No se pudo crear colección')
  return result
 def coverage(p,ids):
  bad=P();flag=e.GEOSCoverageIsValid(p,0,C.byref(bad))
  if flag not in [0,1]:raise ValueError('Error de comprobación de cobertura')
  affected=[]
  if bad:
   affected=[ids[i] for i in range(e.GEOSGetNumGeometries(bad)) if e.GEOSisEmpty(e.GEOSGetGeometryN(bad,i))==0];e.GEOSGeom_destroy(bad)
  return {'valida':bool(flag),'entidades_con_bordes_no_coincidentes':len(affected),'ids':affected}
 def hausdorff(a,b):
  ba=e.GEOSBoundary(a);bb=e.GEOSBoundary(b);v=D()
  if e.GEOSHausdorffDistance(ba,bb,C.byref(v))!=1:raise ValueError('Error de distancia')
  e.GEOSGeom_destroy(ba);e.GEOSGeom_destroy(bb);return v.value
 destination=g.OSRNewSpatialReference(None)
 if g.OSRSetFromUserInput(destination,b'OGC:CRS84')!=0:raise ValueError('CRS84 no disponible')
 g.OSRSetAxisMappingStrategy(destination,0)
 report={'gdal':g.GDALVersionInfo(b'RELEASE_NAME').decode(),'geos':e.GEOSversion().decode(),'adopcion_autorizada':False,'candidatos_adoptados':0,'nota':'Evaluación de copias. Parámetros en metros del SRC nativo; la distancia medida es Hausdorff discreta, no un máximo continuo garantizado. Cobertura significa bordes exactamente compartidos; fallar esa hipótesis no prueba por sí solo que una capa temática sea incorrecta.','ensayos':[]}
 for key,cfg in CONFIG.items():
  folder=internal/key;records=load(folder/'atributos.json');ids=[r['id'] for r in records]
  if len(records)!=cfg['entidades'] or len(set(ids))!=len(ids):raise ValueError('Fuente no corresponde al piloto')
  source=[]
  for row in records:
   b=(folder/(str(row['id'])+'.wkb')).read_bytes()
   if digest(b)!=row['sha256_wkb']:raise ValueError('Copia técnica modificada')
   p=geos(b)
   if e.GEOSisValid(p)!=1:raise ValueError('Geometría de origen inválida; no se repara')
   source.append(p)
  whole=collection(source);original_coverage=coverage(whole,ids)
  algorithm='coverage_vw' if original_coverage['valida'] else 'topology_preserve_por_entidad'
  wkt=(folder/'src.wkt').read_text();src=g.OSRNewSpatialReference(wkt.encode());g.OSRSetAxisMappingStrategy(src,0)
  ct=g.OCTNewCoordinateTransformation(src,destination)
  if not ct:raise ValueError('Transformación no disponible')
  print(key+': hipótesis cobertura '+str(original_coverage['valida']),flush=True)
  for tolerance in [10,25,50]:
   features=[];candidates=[];valid=True;valid_export=True;same_counts=True;delta=0.;absolute_delta=0.;symmetric=0.;max_hd=0.;max_percent=0.;worst=None;total_area=sum(area(p) for p in source)
   simplified=e.GEOSCoverageSimplifyVW(whole,tolerance,0) if algorithm=='coverage_vw' else None
   if algorithm=='coverage_vw' and not simplified:raise ValueError('No se pudo simplificar la copia')
   for i,row in enumerate(records):
    a=source[i];b=e.GEOSGeom_clone(e.GEOSGetGeometryN(simplified,i)) if simplified else e.GEOSTopologyPreserveSimplify(a,tolerance)
    if not b:raise ValueError('Simplificación no disponible')
    candidates.append(b);valid=valid and e.GEOSisValid(b)==1;same_counts=same_counts and counts(a)==counts(b)
    aa=area(a);bb=area(b);delta+=bb-aa;absolute_delta+=abs(bb-aa);max_percent=max(max_percent,100*abs(bb-aa)/aa)
    sym=e.GEOSSymDifference(a,b)
    if not sym:raise ValueError('No se pudo medir diferencia')
    symmetric+=area(sym);e.GEOSGeom_destroy(sym)
    hd=hausdorff(a,b)
    if hd>max_hd:max_hd=hd;worst=row['id']
    wk=dump(b);geom=P()
    if g.OGR_G_CreateFromWkb(C.create_string_buffer(wk),src,C.byref(geom),len(wk))!=0 or g.OGR_G_Transform(geom,ct)!=0:raise ValueError('Error de exportación de candidato')
    obj=gis.json(geom);g.OGR_G_DestroyGeometry(geom)
    if obj['type']=='Polygon':obj={'type':'MultiPolygon','coordinates':[obj['coordinates']]}
    geometry_info(obj,orient=True)
    check=g.OGR_G_CreateGeometryFromJson(json.dumps(obj).encode());valid_export=valid_export and gis.valid(check);g.OGR_G_DestroyGeometry(check)
    features.append({'type':'Feature','id':row['id'],'properties':{k:row['properties'][k] for k in cfg['campos']},'geometry':obj})
   temp=collection(candidates);after_coverage=coverage(temp,ids);e.GEOSGeom_destroy(temp)
   raw=(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
   path=output/str(tolerance)/(key+'.geojson');path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
   new_edges=sorted(set(after_coverage['ids'])-set(original_coverage['ids']))
   result={'capa':key,'parametro_m':tolerance,'algoritmo':algorithm,'preserveBoundary':False if algorithm=='coverage_vw' else None,'adoptado':False,'bytes':len(raw),'bytes_gzip_6':len(gzip.compress(raw,compresslevel=6,mtime=0)),'cumple_1mb_transferencia':len(gzip.compress(raw,compresslevel=6,mtime=0))<=1_000_000,'validez_individual':valid,'validez_exportada':valid_export,'mismos_poligonos_y_anillos':same_counts,'cobertura_origen':original_coverage,'cobertura_candidato':after_coverage,'nuevos_ids_bordes_no_coincidentes':new_edges,'area_origen_sumada_m2':total_area,'delta_area_total_m2':delta,'suma_cambios_absolutos_area_m2':absolute_delta,'max_cambio_relativo_area_entidad_pct':max_percent,'diferencia_simetrica_sumada_m2':symmetric,'hausdorff_discreta_max_bordes_m':max_hd,'entidad_peor_hd':worst,'sha256':digest(raw)}
   report['ensayos'].append(result);write(args.informe,report);print(key+' / '+str(tolerance)+': gzip '+str(result['bytes_gzip_6'])+', nuevos bordes '+str(len(new_edges)),flush=True)
   for b in candidates:e.GEOSGeom_destroy(b)
   if simplified:e.GEOSGeom_destroy(simplified)
  e.GEOSGeom_destroy(whole)
  for p in source:e.GEOSGeom_destroy(p)
  g.OCTDestroyCoordinateTransformation(ct);g.OSRDestroySpatialReference(src)
 g.OSRDestroySpatialReference(destination)


if __name__=='__main__':main()
