"""Controles de conservación de MakeValid, sin GIS en CI."""
import copy,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from reparar_drenaje40 import certificar,reparar

class Conservacion(unittest.TestCase):
 def setUp(self):
  self.antes={'type':'MultiPolygon','coordinates':[[[[0.,0.],[1.,0.],[1.,1.],[0.,1.],[0.,0.],[-1.,0.],[-1.,-1.],[0.,-1.],[0.,0.]]]]}
  self.despues={'type':'MultiPolygon','coordinates':[[[[0.,0.],[1.,0.],[1.,1.],[0.,1.],[0.,0.]]],[[[0.,0.],[-1.,0.],[-1.,-1.],[0.,-1.],[0.,0.]]]]}
 def test_dividir_sin_mover_ni_eliminar(self):
  r=certificar(self.antes,self.despues)
  self.assertEqual(r['diferencia_area_exacta_m2'],0)
  self.assertEqual(r['desplazamiento_max_vertices_m'],0)
  self.assertEqual(r['posiciones_despues']-r['posiciones_antes'],1)
 def test_detectar_vertice_movido(self):
  roto=copy.deepcopy(self.despues);roto['coordinates'][0][0][1][0]+=.000000001
  with self.assertRaisesRegex(ValueError,'coordenadas'):certificar(self.antes,roto)
 def test_detectar_segmentos_distintos_con_mismos_vertices(self):
  roto=copy.deepcopy(self.despues);ring=roto['coordinates'][0][0];ring[1],ring[2]=ring[2],ring[1]
  with self.assertRaisesRegex(ValueError,'segmentos'):certificar(self.antes,roto)
 def test_no_descartar_partes_colapsadas(self):
  roto={'type':'GeometryCollection','geometries':[self.despues,{'type':'LineString','coordinates':[[0,0],[1,1]]}]}
  with self.assertRaisesRegex(ValueError,'descartan'):certificar(self.antes,roto)
 def test_no_reparar_otros_fid(self):
  with self.assertRaisesRegex(ValueError,'no autorizado'):reparar(None,None,485)

if __name__=='__main__':unittest.main()
