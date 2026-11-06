"""Servidor HTTP exclusivo de Playwright, accesible solo desde esta máquina."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class TestHTTPServer(ThreadingHTTPServer):
    # Python 3.9 usa una cola de 5: las ráfagas de recursos de Chromium pueden
    # saturarla y provocar ERR_CONNECTION_RESET aun con archivos existentes.
    request_queue_size = 128


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    with TestHTTPServer(("127.0.0.1", 8765), handler) as server:
        server.serve_forever()
