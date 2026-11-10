"""Diagnóstico local de red lenta; comprime solo capas del catálogo publicado."""
import gzip
import json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
ROOT=Path(__file__).resolve().parents[1]
catalog=json.loads((ROOT/'catalogo_determinantes_para_geovisor.json').read_text())
paths=[c['archivo'] for g in catalog['grupos'] for c in g['capas'] if c.get('archivo')]
paths+=['datos/piloto_29/'+c['ruta_relativa'] for c in json.loads((ROOT/'datos/piloto_29/catalogo_entrega.json').read_text())]
PAYLOAD={}
for name in paths:
 p=(ROOT/name).resolve()
 if not p.is_relative_to(ROOT/'datos') or p.suffix!='.geojson':raise ValueError('Ruta ajena al catálogo público')
 PAYLOAD['/'+name]=gzip.compress(p.read_bytes(),compresslevel=6,mtime=0)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT),**kw)
 def do_GET(self):
  pathname=self.path.split('?',1)[0]
  if any(part.startswith('.') for part in pathname.split('/') if part):self.send_error(404);return
  if pathname not in PAYLOAD:return super().do_GET()
  data=PAYLOAD[pathname];self.send_response(200)
  for k,v in [('Content-Type','application/geo+json; charset=utf-8'),('Content-Encoding','gzip'),('Content-Length',str(len(data))),('Cache-Control','no-store')]:self.send_header(k,v)
  self.end_headers();self.wfile.write(data)
 def log_message(self,*args):pass
class Server(ThreadingHTTPServer):request_queue_size=128
if __name__=='__main__':
 with Server(('127.0.0.1',8878),Handler) as server:server.serve_forever()
