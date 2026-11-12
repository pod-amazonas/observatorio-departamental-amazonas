"""Servidor HTTP exclusivo de Playwright, accesible solo desde esta máquina."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class TestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Rangos reales para las familias PMTiles autorizadas; el resto no cambia.
        import re
        archive = self.path.split('?', 1)[0]
        if not re.fullmatch(r'/datos/(?:teselas_40/drenaje_doble|rondas_43/teselas/determinante_(?:2[0-9]|3[01]))\.pmtiles', archive) or not self.headers.get('Range'):
            return super().do_GET()
        path = Path(self.directory) / archive.lstrip('/')
        if not path.is_file():
            self.send_error(404)
            return
        size = path.stat().st_size
        match = re.fullmatch(r'bytes=(\d+)-(\d+)', self.headers['Range'])
        if not match or int(match[1]) >= size or int(match[2]) < int(match[1]):
            self.send_response(416)
            self.send_header('Content-Range', 'bytes */' + str(size))
            self.end_headers()
            return
        start, end = int(match[1]), min(int(match[2]), size - 1)
        self.send_response(206)
        for key, value in [('Content-Type', 'application/octet-stream'), ('Accept-Ranges', 'bytes'), ('Content-Range', f'bytes {start}-{end}/{size}'), ('Content-Length', str(end-start+1))]:
            self.send_header(key, value)
        self.end_headers()
        with path.open('rb') as stream:
            stream.seek(start)
            try:
                self.wfile.write(stream.read(end-start+1))
            except (BrokenPipeError, ConnectionResetError):
                pass  # El cliente puede cancelar un rango en curso.


class TestHTTPServer(ThreadingHTTPServer):
    # Python 3.9 usa una cola de 5: las ráfagas de recursos de Chromium pueden
    # saturarla y provocar ERR_CONNECTION_RESET aun con archivos existentes.
    request_queue_size = 128


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    handler = partial(TestHandler, directory=str(root))
    with TestHTTPServer(("127.0.0.1", 8765), handler) as server:
        server.serve_forever()
