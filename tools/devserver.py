"""Serveur statique de developpement, sans cache.

`python -m http.server` renvoie Last-Modified et le navigateur garde les modules
ES et le CSS en cache pour toute la session — y compris dans un onglet neuf,
puisque le cache HTTP est partage. On croit alors tester un correctif qui ne
s'execute pas.

Ce serveur ajoute Cache-Control: no-store sur tout. A n'utiliser qu'en local.

    python tools/devserver.py [port]
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Une ligne par requete noie la console ; on ne garde que les erreurs.
        status = args[1] if len(args) > 1 else ""
        if str(status).startswith(("4", "5")):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    server = ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)
    print(f"Elden Chill sur http://localhost:{port} (sans cache)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
