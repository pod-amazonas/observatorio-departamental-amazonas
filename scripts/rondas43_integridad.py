"""Métricas exactas WKB sin cargar millones de vértices como objetos JSON.
Solo biblioteca estándar y sort del sistema. No modifica las geometrías.
El área del original inválido es algebraica, no una cifra oficial.
"""
import struct,mmap,math,os,subprocess
from fractions import Fraction

def stats(path,points):
 result={'posiciones':0,'poligonos':0,'anillos':0,'tipos':{},'anillos_abiertos':0};total=Fraction()
 with path.open('rb') as stream,mmap.mmap(stream.fileno(),0,access=mmap.ACCESS_READ) as b,points.open('wb') as pointfile:
  at=0
  def u32():
   nonlocal at
   v=struct.unpack_from('<I',b,at)[0];at+=4;return v
  def coords(n,role=None):
   nonlocal at,total
   start=at;end=at+16*n;assert end<=len(b);at=end
   if role is not None:result['anillos']+=1
   result['posiciones']+=n
   d=1
   for i in range(start,end,16):
    x,y=struct.unpack_from('<dd',b,i)
    if not math.isfinite(x) or not math.isfinite(y):raise ValueError('Coordenada no finita')
    pointfile.write(struct.pack('<dd',0.0 if x==0 else x,0.0 if y==0 else y).hex().encode()+b'\n')
    if role is not None:d=max(d,x.as_integer_ratio()[1],y.as_integer_ratio()[1])
   if role is not None and n:
    if b[start:start+16]!=b[end-16:end]:result['anillos_abiertos']+=1
    twice=0;previous=None
    for i in range(start,end,16):
     x,y=struct.unpack_from('<dd',b,i);xr=x.as_integer_ratio();yr=y.as_integer_ratio();current=(xr[0]*(d//xr[1]),yr[0]*(d//yr[1]))
     if previous:twice+=previous[0]*current[1]-current[0]*previous[1]
     previous=current
    total+=(1 if role==0 else -1)*Fraction(abs(twice),2*d*d)
  def geom():
   nonlocal at
   assert b[at]==1,'WKB debe ser little endian';at+=1;t=u32();result['tipos'][str(t)]=result['tipos'].get(str(t),0)+1
   if t==3:
    result['poligonos']+=1
    for role in range(u32()):coords(u32(),role)
   elif t in (4,5,6,7):
    for _ in range(u32()):geom()
   elif t==2:coords(u32())
   elif t==1:coords(1)
   else:raise ValueError('Tipo inesperado; detener sin descartar partes')
  geom();assert at==len(b)
 result['area_m2']=float(total);return result,total

def unique(points):
 target=points.with_suffix('.unique');env=dict(os.environ,LC_ALL='C')
 with target.open('wb') as dest:subprocess.run(['sort','-T',str(points.parent),'-u',str(points)],stdout=dest,check=True,env=env)
 return target

def compare(a,b):
 removed=[];added=0;na=nb=0
 with a.open('rb') as aa,b.open('rb') as bb:
  va=aa.readline();vb=bb.readline()
  while va or vb:
   if va and vb and va==vb:na+=1;nb+=1;va=aa.readline();vb=bb.readline()
   elif va and (not vb or va<vb):removed.append(va.strip());na+=1;va=aa.readline()
   else:added+=1;nb+=1;vb=bb.readline()
 maximum=0.
 if removed:
  missing=[struct.unpack('<dd',bytes.fromhex(v.decode())) for v in removed];nearest=[math.inf]*len(missing)
  with b.open('rb') as fixed:
   for line in fixed:
    x,y=struct.unpack('<dd',bytes.fromhex(line.strip().decode()))
    for i,(xx,yy) in enumerate(missing):nearest[i]=min(nearest[i],math.hypot(x-xx,y-yy))
  maximum=max(nearest)
 return {'vertices_unicos_antes':na,'vertices_unicos_despues':nb,'vertices_originales_ausentes':len(removed),'coordenadas_nuevas':added,'desplazamiento_max_vertices_m':maximum}
