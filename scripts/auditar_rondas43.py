"""Audita MVT por zoom sin reparar fragmentos ni reconstruir entidades."""
import ctypes as C,argparse,json,gzip,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main():
 a=argparse.ArgumentParser(description=__doc__);a.add_argument('--gdal-library',required=True);a.add_argument('--geos-library',required=True);args=a.parse_args()
 from preparar_piloto_29 import GIS
 from preparar_rondas43 import load,write,header,manifiesto
 q=GIS(args.gdal_library,args.geos_library);g=q.g;P,S,I=C.c_void_p,C.c_char_p,C.c_int
 for n,r,aa in [('OGR_G_GetGeometryType',I,[P]),('OGR_G_GetGeometryCount',I,[P]),('OGR_G_GetGeometryRef',P,[P,I])]:f=getattr(g,n);f.restype=r;f.argtypes=aa
 def tipos(geom,result):
  typ=g.OGR_G_GetGeometryType(geom);result[str(typ)]=result.get(str(typ),0)+1
  if typ in [4,5,6,7]:
   for i in range(g.OGR_G_GetGeometryCount(geom)):tipos(g.OGR_G_GetGeometryRef(geom,i),result)
 results=[]
 for row in load(ROOT/'datos/rondas_43/entrega.json')['capas']:
  p=ROOT/'datos/rondas_43/teselas'/f"determinante_{row['objectid']}.pmtiles";per=[]
  for z in range(5,13):
   ds=g.GDALOpenEx(str(p).encode(),4,None,(S*3)(('ZOOM_LEVEL='+str(z)).encode(),b'CLIP=NO',None),None);assert ds
   try:
    l=g.GDALDatasetGetLayerByName(ds,b'rondas');assert l;seen=set();n=0;invalid=0;counts={}
    while True:
     f=g.OGR_L_GetNextFeature(l)
     if not f:break
     try:
      definition=g.OGR_F_GetDefnRef(f);fields={g.OGR_Fld_GetNameRef(g.OGR_FD_GetFieldDefn(definition,i)).decode():i for i in range(g.OGR_FD_GetFieldCount(definition))}
      oid=g.OGR_F_GetFieldAsInteger64(f,fields['objectid']);fid=g.OGR_F_GetFieldAsInteger64(f,fields['fid_ronda']);assert oid==row['objectid'] and fid==row['fid_ronda']
      assert g.OGR_F_GetFieldAsString(f,fields['Norma_Asociada']).decode()==row['norma'];seen.add(oid);geom=g.OGR_F_GetGeometryRef(f);tipos(geom,counts);invalid+=not q.valid(geom);n+=1
     finally:g.OGR_F_Destroy(f)
    per.append({'zoom':z,'objectids':sorted(seen),'fragmentos':n,'fragmentos_invalidos_geos':invalid,'tipos_geometria':counts})
   finally:g.GDALClose(ds)
  b=p.read_bytes();h=header(b)
  def directory(offset,size):
   raw=b[offset:offset+size]
   if h['internal_compression']==2:raw=gzip.decompress(raw)
   at=0
   def integer():
    nonlocal at
    value=shift=0
    while True:
     v=raw[at];at+=1;value|=(v&127)<<shift
     if not v&128:return value
     shift+=7
   n=integer();ids=[integer() for _ in range(n)];runs=[integer() for _ in range(n)];lengths=[integer() for _ in range(n)];offsets=[]
   for i in range(n):
    value=integer();offsets.append(offsets[i-1]+lengths[i-1] if value==0 and i else value-1)
   maximum=0
   for run,length,off in zip(runs,lengths,offsets):maximum=max(maximum,length if run else directory(h['leaf_offset']+off,length))
   return maximum
  maximum=directory(h['root_offset'],h['root_bytes']);assert maximum<100000000;assert per[-1]['objectids']==[row['objectid']]
  results.append({'objectid':row['objectid'],'fid_ronda':row['fid_ronda'],'sha256_pmtiles':hashlib.sha256(b).hexdigest(),'teselas':h['addressed_tiles'],'tesela_comprimida_max_bytes':maximum,'por_zoom':per});print('Auditada',row['objectid'],'max tile',maximum,flush=True)
 write(ROOT/'datos/rondas_43/auditoria_teselas.json',{'capas':results,'nota':'Los fragmentos de MVT no son entidades originales y pueden ser inválidos tras cuantización. CLIP=NO evita recortar dos veces. No se reparan ni usan para análisis de superficies.'});manifiesto()
if __name__=='__main__':main()
