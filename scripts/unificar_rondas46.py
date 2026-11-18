#!/usr/bin/env python3
"""Unión sin reteselar: conserva los comandos MVT y atributos de las doce fuentes del #45."""
import argparse, collections, gzip, hashlib, json, struct, subprocess
from pathlib import Path
from preparar_pmtiles40 import header

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'datos/rondas_46'
BASE = 'f5e8ef010a6c3da744295f242003ebfb27f6eda1'  # main tras fusionar #45; se fija completo en la entrega.
IDS = set(range(19, 32))
CONTROL_MVT_19 = 'f7f4f2cdd97151ac8a38c9d606e196ec13aa2fcd66fb321ae48723990567555a'
CONTROL_MVT_PR45 = '2ffd9ba6e47591833e16746675332766a6200a514d14fb8bb51300f8b8db354d'


def sha(b): return hashlib.sha256(b).hexdigest()
def load(p): return json.loads(p.read_text(encoding='utf8'))
def dump(p, obj): p.write_text(json.dumps(obj, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf8')
def gz(b): return gzip.compress(b, mtime=0)


def varint(n):
    if n < 0: raise ValueError('Varint negativo')
    out = bytearray()
    while n > 127: out.append((n & 127) | 128); n >>= 7
    out.append(n)
    return bytes(out)


def integer(b, at):
    n = shift = 0
    while at < len(b) and shift < 70:
        v = b[at]; at += 1; n |= (v & 127) << shift
        if not v & 128: return n, at
        shift += 7
    raise ValueError('Varint truncado o excesivo')


def fields(b):
    at = 0
    while at < len(b):
        key, at = integer(b, at); number, wire = key >> 3, key & 7
        if not number: raise ValueError('Campo protobuf cero')
        if wire == 0: value, at = integer(b, at)
        else:
            if wire == 2: size, at = integer(b, at)
            elif wire in (1, 5): size = 8 if wire == 1 else 4
            else: raise ValueError('Wire protobuf no admitido')
            value = b[at:at+size]; at += size
            if len(value) != size: raise ValueError('Protobuf truncado')
        yield number, wire, value


def field(n, wire, value):
    return varint(n*8+wire)+(varint(value) if wire == 0 else (varint(len(value)) if wire == 2 else b'')+value)


def packed(b):
    out = []; at = 0
    while at < len(b): v, at = integer(b, at); out.append(v)
    return out


def value(b):
    f = list(fields(b))
    if len(f) != 1: raise ValueError('Valor MVT ambiguo')
    n, w, v = f[0]
    if n == 1 and w == 2: return v.decode('utf8')
    if n in (4, 5) and w == 0: return v
    if n == 3 and w == 1: return struct.unpack('<d', v)[0]
    if n == 2 and w == 5: return struct.unpack('<f', v)[0]
    if n == 6 and w == 0: return (v >> 1) ^ -(v & 1)
    if n == 7 and w == 0: return bool(v)
    raise ValueError('Tipo MVT desconocido')


def directory(b):
    at = 0; n, at = integer(b, at); arrays = []
    for _ in range(4):
        row = []
        for i in range(n): v, at = integer(b, at); row.append(v)
        arrays.append(row)
    if at != len(b): raise ValueError('Directorio con bytes sobrantes')
    ids, runs, sizes, offsets = arrays; tileid = 0; previous = 0
    for i in range(n):
        tileid += ids[i]
        off = previous if offsets[i] == 0 and i else offsets[i]-1
        if off < 0: raise ValueError('Offset negativo')
        yield tileid, runs[i], sizes[i], off
        previous = off+sizes[i]


def encode_directory(rows):
    out = varint(len(rows)); previous = 0
    for tileid, _, _, _ in rows: out += varint(tileid-previous); previous = tileid
    for col in (1, 2): out += b''.join(varint(r[col]) for r in rows)
    previous = None
    for _, _, size, off in rows:
        out += varint(0 if off == previous else off+1); previous = off+size
    return gz(out)


def tiles(b):
    h = header(b)
    if (h['internal_compression'], h['tile_compression'], h['tile_type'], h['minzoom'], h['maxzoom']) != (2, 2, 1, 5, 12): raise ValueError('PMTiles no compatible')
    def walk(off, size):
        raw = b[off:off+size]
        if len(raw) != size: raise ValueError('Directorio truncado')
        for tileid, run, size, off in directory(gzip.decompress(raw)):
            if not run: yield from walk(h['leaf_offset']+off, size)
            else:
                raw = b[h['tile_offset']+off:h['tile_offset']+off+size]
                if len(raw) != size: raise ValueError('Tesela truncada')
                for i in range(run): yield tileid+i, gzip.decompress(raw)
    yield from walk(h['root_offset'], h['root_bytes'])


def layer(raw):
    layers = [v for n, w, v in fields(raw) if n == 3 and w == 2]
    if len(layers) != 1: raise ValueError('Debe haber una sola capa MVT')
    fs = list(fields(layers[0])); scalar = {n: v for n, w, v in fs if n in (1, 5, 15)}
    if scalar != {1: b'rondas', 5: 4096, 15: 2}: raise ValueError('Nombre, extent o versión diferente')
    if any(n not in (1, 2, 3, 4, 5, 15) for n, _, _ in fs): raise ValueError('Campo nuevo de capa: requiere revisión')
    return [v for n, _, v in fs if n == 2], [v for n, _, v in fs if n == 3], [v for n, _, v in fs if n == 4]


def feature(raw, keys, values):
    fs = list(fields(raw)); tags = []; seen = set()
    for n, w, v in fs:
        if n in seen or n not in (1, 2, 3, 4): raise ValueError('Campo repetido o inesperado de entidad')
        seen.add(n)
        if n == 2:
            if w != 2: raise ValueError('Tags no packed')
            tags = packed(v)
    if len(tags) % 2: raise ValueError('Tags impares')
    props = {keys[tags[i]].decode('utf8'): value(values[tags[i+1]]) for i in range(0, len(tags), 2)}
    data = {n: v for n, _, v in fs}
    if data.get(3) not in (2, 3) or not data.get(4): raise ValueError('Geometría ausente o tipo no autorizado')
    if len(props) != len(tags)//2: raise ValueError('Atributos duplicados')
    semantics = sorted((keys[tags[i]].hex(), values[tags[i+1]].hex()) for i in range(0, len(tags), 2))
    return fs, tags, props, data, semantics


def zoom(tileid):
    z = 0
    while tileid >= ((1 << (2*(z+1)))-1)//3: z += 1
    return z


class Audit:
    def __init__(self): self.rows = {}
    def add(self, tileid, raw, keys, values):
        _, _, p, d, attrs = feature(raw, keys, values); oid = p.get('objectid')
        if oid not in IDS or (p.get('fid_ronda') is not None if oid==19 else p.get('fid_ronda') != oid-18) or p.get('Nombre') != 'Rondas hídricas' or p.get('Norma_Asociada') != 'Resolución 957 de 2018': raise ValueError('Identidad no autorizada')
        if set(p) != (set(load(ROOT/'datos/rondas_43/diccionario_campos.json'))-{'fid_ronda','Fuente_hidrica','Longitud_buffer'} if oid==19 else set(load(ROOT/'datos/rondas_43/diccionario_campos.json'))): raise ValueError('Campos públicos diferentes')
        key = (oid, zoom(tileid)); row = self.rows.setdefault(key, [hashlib.sha256(), hashlib.sha256(), collections.Counter()])
        identity = struct.pack('<QQB', tileid, d.get(1, 0), d[3])+varint(len(d[4]))+d[4]
        row[0].update(identity)
        row[1].update(identity+json.dumps(attrs, separators=(',', ':')).encode()+b'\n')
        row[2][d[3]] += 1
    def result(self):
        return [{'determinante': oid, 'zoom': z, 'sha256_geometria_mvt': a.hexdigest(), 'sha256_geometria_y_atributos': b.hexdigest(), 'poligonos_fragmentados': c[3], 'lineas_fragmentadas': c[2]} for (oid, z), (a, b, c) in sorted(self.rows.items())]


def merge(parts):
    keys = []; values = []; keymap = {}; valuemap = {}; feats = []
    for raw in parts:
        oldfeats, oldkeys, oldvalues = layer(raw)
        for f in oldfeats:
            fs, tags, _, _, _ = feature(f, oldkeys, oldvalues); newtags = []
            for i in range(0, len(tags), 2):
                k, v = oldkeys[tags[i]], oldvalues[tags[i+1]]
                if k not in keymap: keymap[k] = len(keys); keys.append(k)
                if v not in valuemap: valuemap[v] = len(values); values.append(v)
                newtags.extend((keymap[k], valuemap[v]))
            # Solo se renumeran índices de diccionario. ID, tipo y comandos no cambian.
            feats.append(b''.join(field(n, w, b''.join(varint(t) for t in newtags) if n == 2 else v) for n, w, v in fs))
    raw = field(1, 2, b'rondas')+b''.join(field(2, 2, f) for f in feats)+b''.join(field(3, 2, k) for k in keys)+b''.join(field(4, 2, v) for v in values)+field(5, 0, 4096)+field(15, 0, 2)
    return field(3, 2, raw)


def archive(tilemap, metadata, bbox):
    rows = []; content = bytearray()
    for tileid, raw in sorted(tilemap.items()):
        b = gz(raw); rows.append((tileid, 1, len(b), len(content))); content.extend(b)
    leaf = b''; root = encode_directory(rows)
    if len(root) > 16384-127:
        pointers = []
        for i in range(0, len(rows), 512):
            b = encode_directory(rows[i:i+512]); pointers.append((rows[i][0], 0, len(b), len(leaf))); leaf += b
        root = encode_directory(pointers)
    if len(root) > 16384-127: raise ValueError('Raíz PMTiles demasiado grande')
    meta = gz(json.dumps(metadata, ensure_ascii=False, separators=(',', ':')).encode())
    ro = 127; mo = ro+len(root); lo = mo+len(meta); to = lo+len(leaf)
    h = bytearray(127); h[:8] = b'PMTiles\x03'
    struct.pack_into('<11Q', h, 8, ro, len(root), mo, len(meta), lo, len(leaf), to, len(content), len(rows), len(rows), len(rows))
    h[96:102] = bytes([1, 2, 2, 1, 5, 12]); struct.pack_into('<4i', h, 102, *bbox)
    h[118] = 7; struct.pack_into('<2i', h, 119, (bbox[0]+bbox[2])//2, (bbox[1]+bbox[3])//2)
    return bytes(h)+root+meta+leaf+content


def source_file(revision, name):
    return subprocess.run(['git', 'show', revision+':datos/rondas_43/'+name], cwd=ROOT, check=True, capture_output=True).stdout


def build():
    revision = subprocess.run(['git', 'rev-parse', BASE], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    delivery = json.loads(source_file(revision, 'entrega.json')); grouped = collections.defaultdict(list); before = Audit(); sources = []; boxes = []
    for r in delivery['capas']:
        oid = r['objectid']; name = f'teselas/determinante_{oid}.pmtiles'; b = source_file(revision, name)
        if sha(b) != r['sha256']: raise ValueError('Fuente #45 modificada')
        boxes.append(struct.unpack_from('<4i', b, 102))
        for tileid, raw in tiles(b):
            feats, keys, values = layer(raw)
            for f in feats: before.add(tileid, f, keys, values)
            grouped[tileid].append(raw)
        sources.append({'determinante': oid, 'archivo_en_pr45': 'datos/rondas_43/'+name, 'sha256_pmtiles_pr45': sha(b), 'sha256_geometria_nativa_pr45': r['sha256_geometria_usada']})
        print('Fuente verificada', oid, flush=True)
    combined = {tid: merge(parts) for tid, parts in sorted(grouped.items())}
    bbox = [min(b[i] for b in boxes) if i < 2 else max(b[i] for b in boxes) for i in range(4)]
    metadata = {'name': 'Rondas hídricas (Corpoamazonia, Res. 957 de 2018)', 'description': 'Determinantes 20–31. La 19 sigue pendiente (#44). Unión sin reteselear del #45.', 'version': '1', 'type': 'overlay', 'format': 'pbf', 'minzoom': 5, 'maxzoom': 12, 'bounds': ','.join(str(n/1e7) for n in bbox), 'vector_layers': [{'id': 'rondas', 'minzoom': 5, 'maxzoom': 12, 'fields': {k: 'Number' if k in ('objectid', 'fid_ronda', 'Anio', 'Longitud_buffer') else 'String' for k in load(ROOT/'datos/rondas_43/diccionario_campos.json')}}]}
    b = archive(combined, metadata, bbox); OUT.mkdir(exist_ok=True); (OUT/'rondas.pmtiles').write_bytes(b)
    after = Audit()
    for tid, raw in tiles(b):
        feats, keys, values = layer(raw)
        for f in feats: after.add(tid, f, keys, values)
    if before.result() != after.result(): raise ValueError('La unión cambió geometrías o atributos')
    expected = {(oid, z) for oid in IDS for z in range(5, 13)}
    if set(before.rows) != expected: raise ValueError('Falta una determinante o nivel')
    dump(OUT/'integridad.json', {'revision_pr45': revision, 'metodo': 'Copia exacta de ID, tipo, comandos MVT y valores de atributos; solo índices de diccionario y compresión cambian. Sin reproyección, recorte, simplificación, reparación o disolución.', 'fuentes': sources, 'antes': before.result(), 'despues': after.result(), 'identicos': True})
    dump(OUT/'entrega.json', {'nombre': metadata['name'], 'archivo': 'datos/rondas_46/rondas.pmtiles', 'bytes': len(b), 'sha256': sha(b), 'bbox': [n/1e7 for n in bbox], 'minzoom': 5, 'maxzoom': 12, 'dataLayer': 'rondas', 'determinantes': sorted(IDS), 'pendientes': [19], 'fuente': 'Corpoamazonia', 'anio': 2022, 'norma': 'Resolución 957 de 2018', 'teselas': len(combined), 'tesela_comprimida_max_bytes': max(len(gz(raw)) for raw in combined.values())})
    manifest(); check()


def manifest():
    (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+p.name+'\n' for p in sorted(OUT.iterdir()) if p.is_file() and p.name != 'SHA256SUMS'))


def check():
    d = load(OUT/'entrega.json'); b = (OUT/'rondas.pmtiles').read_bytes(); proof = load(OUT/'integridad.json')
    if sha(b) != d['sha256'] or len(b) != d['bytes']: raise ValueError('PMTiles no coincide con manifiesto')
    h = header(b); meta = json.loads(gzip.decompress(b[h['metadata_offset']:h['metadata_offset']+h['metadata_bytes']]))
    layers = meta.get('vector_layers', [])
    if len(layers) != 1 or layers[0]['id'] != 'rondas' or set(layers[0]['fields']) != set(load(ROOT/'datos/rondas_43/diccionario_campos.json')): raise ValueError('Metadatos de capa única incorrectos')
    audit = Audit(); count = 0
    for tid, raw in tiles(b):
        count += 1; feats, keys, values = layer(raw)
        for f in feats: audit.add(tid, f, keys, values)
    if sha(json.dumps(proof['antes'], sort_keys=True, separators=(',', ':')).encode()) != CONTROL_MVT_PR45: raise ValueError('Control #45 alterado')
    previous=[r for r in audit.result() if r['determinante']!=19]
    if proof['antes'] != previous or proof['despues'] != previous: raise ValueError('Geometrías/atributos cambiaron')
    from agregar_ronda19_44 import ORIGINAL
    added=load(OUT/'determinante_19.json')
    if added['sha256_original']!=ORIGINAL or added['sha256_copia_nativa_releida']!=ORIGINAL or not added['valida_geos'] or added['reparada']: raise ValueError('Geometría fuente 19 alterada')
    if sha(json.dumps(added['antes_mvt'],sort_keys=True,separators=(',',':')).encode())!=CONTROL_MVT_19: raise ValueError('Control de fuente 19 alterado')
    current=[r for r in audit.result() if r['determinante']==19]
    if len(current)!=8 or current!=added['antes_mvt'] or current!=added['despues_mvt']: raise ValueError('Ronda 19 cambió al unir teselas')
    if len(audit.rows) != 104 or count != d['teselas'] or d['determinantes'] != sorted(IDS) or d['pendientes'] != []: raise ValueError('Cobertura o pendientes incorrectos')
    expected = {'LEEME.md','diccionario_campos.json','integridad.json','entrega.json','determinante_19.json','rondas.pmtiles'}
    if {p.name for p in OUT.iterdir() if p.is_file() and p.name != 'SHA256SUMS'}!=expected: raise ValueError('Archivos faltantes o no autorizados')
    if set(load(OUT/'diccionario_campos.json'))!=set(load(ROOT/'datos/rondas_43/diccionario_campos.json')): raise ValueError('Diccionario público incompleto')
    lines = (OUT/'SHA256SUMS').read_text().splitlines()
    if {s.split('  ')[1] for s in lines} != expected or len(lines) != len(expected): raise ValueError('Manifiesto incompleto')
    for line in lines:
        digest, name = line.split('  ', 1)
        if name not in expected or sha((OUT/name).read_bytes()) != digest: raise ValueError('SHA-256 diferente')
    print(f'Unión verificada: 13 determinantes × 8 niveles; 20–31 intactas y 19 de fuente catálogo sin reparar. {len(b)} bytes.', flush=True)


def integrate():
    d = load(OUT/'entrega.json'); catalog = load(ROOT/'catalogo_determinantes_para_geovisor.json')
    spec = {k: d[k] for k in ('bytes', 'sha256', 'bbox', 'minzoom', 'maxzoom', 'dataLayer')}
    catalog['rondasUnificadas'] = {**d, 'teselas': spec, 'leyenda': 'Rondas hídricas y partes lineales conservadas', 'advertencia': 'Incluye determinantes 19–31. La 19 conserva la geometría de Determinantes_Ambientales_CAR: diferencia de unos 53 m frente a Rondas_Hidricas FID 1, documentada sin corrección (#44). Las copias corregidas del #45 conservan vértices y área algebraica. Consulta por zoom; no acredita acotamiento ni límites certificados.'}
    for g in catalog['grupos']:
        for r in g['capas']:
            if r['objectid'] in IDS:
                r.update(archivoTeselas=d['archivo'], teselas=spec, grupoVisualizacion='rondas46')
                if r['objectid']==19:r.update(estado='aprobada_disponible_teselas',etiqueta='Rondas hídricas — entidad 19',norma=load(OUT/'determinante_19.json')['atributos']['Norma_Asociada'],fuenteDeclarada='Corpoamazonia',anioFuente=2022,advertencia=load(OUT/'determinante_19.json')['observacion'])
    catalog.update(estado='publicacion_autorizada_20_geojson_1_pmtiles_rondas', cantidadTeselas=1, cantidadRegistrosEnTeselas=13, cantidadGeoJSONDisponibles=sum(bool(r.get('archivo')) for g in catalog['grupos'] for r in g['capas']), pendientes=0,
                   nota='33 de 33 registros disponibles: 20 GeoJSON y 13 determinantes reunidas en una capa PMTiles; 0 pendientes. Las cifras del navegador no son oficiales.')
    dump(ROOT/'catalogo_determinantes_para_geovisor.json', catalog)
    # Las referencias operativas se migran al archivo único; el historial #45
    # conserva las fuentes verificadas para regeneración y auditoría independiente.
    for oid in range(20,32):
        p = ROOT/f'datos/rondas_43/teselas/determinante_{oid}.pmtiles'
        if p.exists():
            expected = next(r for r in load(OUT/'integridad.json')['fuentes'] if r['determinante'] == oid)['sha256_pmtiles_pr45']
            if sha(p.read_bytes()) != expected: raise ValueError('No retirar fuente modificada')
            p.unlink()
    from preparar_rondas43 import manifiesto
    manifiesto()
    print('Catálogo unificado; doce archivos individuales retirados de la distribución actual.')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--generar', action='store_true'); p.add_argument('--integrar', action='store_true'); args = p.parse_args()
    try:
        if args.generar: raise ValueError('Use agregar_ronda19_44.py --integrar CARPETA_ANALISIS para regenerar; unión histórica de doce fuentes en #47.')
        check()
        if args.integrar: integrate()
    except (ValueError, KeyError, OSError, IndexError, subprocess.CalledProcessError) as e: raise SystemExit('Unión detenida: '+str(e))
