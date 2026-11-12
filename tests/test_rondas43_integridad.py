import unittest,struct,tempfile,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from rondas43_integridad import stats,unique,compare

def polygon(points):return struct.pack('<BIII',1,3,1,len(points))+b''.join(struct.pack('<dd',*p) for p in points)
def line(points):return struct.pack('<BII',1,2,len(points))+b''.join(struct.pack('<dd',*p) for p in points)
def multi(typ,geoms):return struct.pack('<BII',1,typ,len(geoms))+b''.join(geoms)

class Integridad(unittest.TestCase):
 def evaluar(self,a,b):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t);(p/'a.wkb').write_bytes(a);(p/'b.wkb').write_bytes(b)
   sa,aa=stats(p/'a.wkb',p/'a.points');sb,ab=stats(p/'b.wkb',p/'b.points');return sa,sb,ab-aa,compare(unique(p/'a.points'),unique(p/'b.points'))
 def test_conservar_partes_lineales_sin_perder_vertices(self):
  a=multi(6,[polygon([(0.,0.),(1.,1.),(2.,2.),(0.,0.)])]);b=multi(7,[line([(0.,0.),(1.,1.),(2.,2.)])])
  sa,sb,area,movement=self.evaluar(a,b);self.assertEqual(area,0);self.assertEqual(movement['desplazamiento_max_vertices_m'],0);self.assertEqual(movement['vertices_unicos_antes'],3);self.assertEqual(movement['vertices_unicos_despues'],3);self.assertEqual(sb['tipos']['2'],1)
 def test_detectar_un_cambio_muy_pequeno_sin_redondearlo_a_cero(self):
  original=[(0.,0.),(1.,0.),(1.,1.),(0.,1.),(0.,0.)];altered=original.copy();altered[1]=(1.000000001,0.)
  sa,sb,area,movement=self.evaluar(multi(6,[polygon(original)]),multi(6,[polygon(altered)]));self.assertNotEqual(area,0);self.assertGreater(movement['desplazamiento_max_vertices_m'],0);self.assertEqual(movement['vertices_originales_ausentes'],1)
 def test_reordenar_no_cambia_area_exacta(self):
  a=[(4_000_000.,1_000_000.),(4_000_001.,1_000_000.),(4_000_001.,1_000_001.),(4_000_000.,1_000_001.),(4_000_000.,1_000_000.)]
  sa,sb,area,movement=self.evaluar(multi(6,[polygon(a)]),multi(6,[polygon(list(reversed(a)))]));self.assertEqual(area,0);self.assertEqual(sa['area_m2'],1);self.assertEqual(movement['desplazamiento_max_vertices_m'],0)

if __name__=='__main__':unittest.main()
