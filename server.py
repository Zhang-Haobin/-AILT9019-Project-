#!/usr/bin/env python3
"""Serve the local prototype and its curated sources using the standard library."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
RESEARCH = ROOT / 'docs' / 'research' / 'hku-recycling'


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}

    def translate_path(self, path):
        route = unquote(urlsplit(path).path)
        allowed = {
            '/data/knowledge_base.json': RESEARCH / 'knowledge_base.json',
            '/data/sources.json': RESEARCH / 'sources.json',
            '/sources/recycling-101.pdf': RESEARCH / 'sources' / 'hku-recycling-101-official.pdf',
        }
        if route in allowed:
            return str(allowed[route])
        return super().translate_path(path)

    def list_directory(self, path):
        self.send_error(404, 'Page not found')
        return None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description='Run the HKU recycling prototype locally.')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    for filename in ('knowledge_base.json', 'sources.json'):
        if not (RESEARCH / filename).is_file():
            parser.error(f'Missing research file: {RESEARCH / filename}')
    handler = partial(Handler, directory=str(PUBLIC))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    except OSError as exc:
        parser.exit(1, f'Cannot start server: {exc}. Try --port 8001.\n')
    print(f'Local: http://127.0.0.1:{args.port}', flush=True)
    print('Press Ctrl+C to stop. No external API calls or query storage.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
