import ctypes as C,sys,pathlib,json,gzip,struct,os,argparse
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
a=argparse.ArgumentParser(description='Audita zooms, IDs y validez de fragmentos MVT sin reparar ni modificar geometrías');a.add_argument('--gdal-library',required=True);a.add_argument('--geos-library',required=True);args=a.parse_args()
from preparar_piloto_29 import GIS
from preparar_pmtiles40 import header
q=GIS(args.gdal_library,args.geos_library);g=q.g
p=ROOT/'datos/teselas_40/drenaje_doble.pmtiles';m=json.loads((p.parent/'catalogo.json').read_text());results=[]
for z in range(5,13):
 ds=g.GDALOpenEx(str(p).encode(),4,None,(C.c_char_p*3)(('ZOOM_LEVEL='+str(z)).encode(),b'CLIP=NO',None),None);assert ds
 layer=g.GDALDatasetGetLayerByName(ds,b'drenaje');seen=set();n=0;invalid=[]
 while True:
  f=g.OGR_L_GetNextFeature(layer)
  if not f:break
  d=g.OGR_F_GetDefnRef(f);idx=next(i for i in range(g.OGR_FD_GetFieldCount(d)) if g.OGR_Fld_GetNameRef(g.OGR_FD_GetFieldDefn(d,i))==b'origen_id');source_id=g.OGR_F_GetFieldAsInteger64(f,idx);seen.add(source_id);n+=1
  if not q.valid(g.OGR_F_GetGeometryRef(f)):invalid.append(source_id);g.OGR_F_Destroy(f)
 g.GDALClose(ds);results.append({'zoom':z,'fragmentos':n,'fragmentos_no_validos_geos':len(invalid),'ids_con_fragmentos_no_validos':sorted(set(invalid)),'entidades_representadas':len(seen),'ids_no_representados':sorted(set(m['ids_seleccionados'])-seen),'metros_mercator_por_unidad':40075016.68557849/(2**z*4096),'tolerancia_simplificacion_unidades':0 if z==12 else 1});print(z,n,len(seen),flush=True)
b=p.read_bytes();h=header(b);raw=gzip.decompress(b[h['root_offset']:h['root_offset']+h['root_bytes']]);at=0
def varint():
 global at
 n=0;shift=0
 while True:
  v=raw[at];at+=1;n|=(v&127)<<shift
  if not v&128:return n
  shift+=7
count=varint();deltas=[varint() for _ in range(count)];runs=[varint() for _ in range(count)];lengths=[varint() for _ in range(count)]
report={'por_zoom':results,'tesela_comprimida_max_bytes':max(lengths),'no_reduccion_adaptativa_por_tamano':max(lengths)<100000000,'sha256_pmtiles':__import__('hashlib').sha256(b).hexdigest(),'nota':'Lectura CLIP=NO para evitar que el lector recorte otra vez el búfer. Los fragmentos no son entidades originales: una entidad aparece en varias teselas. Lo ausente a zoom bajo puede colapsar por cuantización; no se borró de la referencia.'}
(ROOT/'datos/teselas_40/auditoria_teselas.json').write_text(json.dumps(report,indent=2)+'\n')

from preparar_pmtiles40 import actualizar_manifiesto
actualizar_manifiesto()
