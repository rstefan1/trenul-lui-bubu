#!/usr/bin/env python3
"""Local development server for the game.

Serves the repository folder (wherever the script is started from) and tells
the browser not to keep any file in its cache, so that after a change the
browser never mixes old and new JavaScript modules.

Usage:
    python3 serve.py              # http://localhost:8000/
    python3 serve.py 8080         # another port
    python3 serve.py 8000 0.0.0.0 # reachable from a phone on the same network
"""

import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Static files with caching turned off."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.webp': 'image/webp',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    host = sys.argv[2] if len(sys.argv) > 2 else '127.0.0.1'
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer((host, port), handler) as server:
        print(f'Trenul lui Bubu: http://localhost:{port}/  (Ctrl+C to stop)')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print()


if __name__ == '__main__':
    main()
