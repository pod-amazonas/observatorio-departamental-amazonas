"""Servidor de diagnóstico local; no usar para publicación. Solo escucha en loopback."""
import gzip,json,pathlib
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'datos/piloto_29'
CAT={r['id_capa']:DATA/r['ruta_relativa'] for r in json.loads((DATA/'catalogo_entrega.json').read_text())}
# Se sirven solo archivos públicos aprobados; nunca la geodatabase o copias internas.
PAYLOAD={k:gzip.compress(p.read_bytes(),compresslevel=6,mtime=0) for k,p in CAT.items()}
PATHS={'/'+p.relative_to(ROOT).as_posix():k for k,p in CAT.items()}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  pathname=self.path.split('?',1)[0]
  if pathname in PATHS or pathname.startswith('/__piloto29/'):
   key=PATHS.get(pathname) or pathname.split('/__piloto29/',1)[1]
   if key not in PAYLOAD:self.send_error(404);return
   b=PAYLOAD[key];self.send_response(200);self.send_header('Content-Type','application/geo+json; charset=utf-8');self.send_header('Content-Encoding','gzip');self.send_header('Content-Length',str(len(b)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(b);return
  super().do_GET()
 def log_message(self,*args):pass
class Server(ThreadingHTTPServer):request_queue_size=128
with Server(('127.0.0.1',8877),Handler) as s:s.serve_forever()
