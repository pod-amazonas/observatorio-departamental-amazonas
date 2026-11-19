"""Regresiones de unión sin reteselear: colisiones de diccionario y cambios detectables."""
import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from unificar_rondas46 import field, varint, merge, layer, feature, Audit, directory, encode_directory, archive, tiles
import gzip


def tile(oid, reverse=False, geom=None, extra=None):
    props = {'objectid': oid, 'fid_ronda': oid-18, 'Nombre': 'Rondas hídricas',
             'Norma_Asociada': 'Resolución 957 de 2018', 'Fuente': 'Corpoamazonia',
             'Anio': 2022, 'Fuente_hidrica': 'Drenaje sencillo Amazonas', 'Longitud_buffer': 30}
    if oid==19:
        for key in ['fid_ronda','Fuente_hidrica','Longitud_buffer']:props.pop(key)
    if extra:props.update(extra)
    items = list(props.items())
    if reverse: items.reverse()
    keys = [k.encode() for k, _ in items]
    values = [field(1, 2, v.encode()) if isinstance(v, str) else field(5, 0, v) for _, v in items]
    tags = b''.join(varint(v) for i in range(len(items)) for v in (i, i))
    geom = geom or bytes([9, 0, 0, 26, 20, 0, 0, 20, 19, 0, 15])
    f = field(1, 0, oid-18)+field(2, 2, tags)+field(3, 0, 3)+field(4, 2, geom)
    return field(3, 2, field(1, 2, b'rondas')+field(2, 2, f)+b''.join(field(3, 2, k) for k in keys)+b''.join(field(4, 2, v) for v in values)+field(5, 0, 4096)+field(15, 0, 2))


def audit(raw):
    a = Audit(); feats, keys, values = layer(raw)
    for f in feats: a.add(5592405, f, keys, values)  # primer tileid de z12
    return a.result()


class UnionTest(unittest.TestCase):
    def test_diccionarios_colisionan_pero_geometrias_y_tildes_no_cambian(self):
        first, second = tile(20), tile(21, reverse=True)
        combined = merge([first, second])
        self.assertEqual(audit(combined), audit(first)+audit(second))
        feats, keys, values = layer(combined)
        self.assertEqual(len(feats), 2)  # no disuelve polígonos coincidentes
        self.assertEqual([feature(f, keys, values)[2]['objectid'] for f in feats], [20, 21])
        self.assertEqual([feature(f, keys, values)[2]['Nombre'] for f in feats], ['Rondas hídricas']*2)

    def test_un_comando_distinto_o_un_atributo_distinto_no_pasa_por_igual(self):
        self.assertNotEqual(audit(tile(20)), audit(tile(20, geom=bytes([9, 2, 0, 26, 20, 0, 0, 20, 19, 0, 15]))))
        self.assertNotEqual(audit(tile(20)), audit(tile(21)))

    def test_protobuf_truncado_y_nombre_de_capa_ajeno_se_rechazan(self):
        with self.assertRaises(ValueError): list(layer(b'\x1a\xff'))
        with self.assertRaises(ValueError): merge([tile(20).replace(b'rondas', b'otraaa')])

    def test_19_se_une_sin_inventar_identidad_de_rondas_hidricas(self):
        first,second=tile(19),tile(20)
        self.assertEqual(audit(merge([first,second])),audit(first)+audit(second))
        with self.assertRaises(ValueError):audit(tile(19,extra={'fid_ronda':1}))
        forged=first.replace(b'Corpoamazonia',b'CORPOAMAZONIA')
        self.assertNotEqual(audit(first),audit(forged))

    def test_directorio_offsets_contiguos_y_punteros_a_hojas(self):
        rows = [(341, 1, 90, 0), (345, 2, 20, 90), (400, 0, 50, 321)]
        self.assertEqual(list(directory(gzip.decompress(encode_directory(rows)))), rows)

    def test_archivo_unico_contiene_una_capa_y_comandos_iguales(self):
        merged = merge([tile(20), tile(21, reverse=True)])
        result = archive({5592405: merged}, {'vector_layers': [{'id': 'rondas'}]}, [-750000000, -50000000, -690000000, 10000000])
        self.assertEqual(list(tiles(result)), [(5592405, merged)])


if __name__ == '__main__': unittest.main()
