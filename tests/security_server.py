"""Local static server that applies the Pages security headers for browser checks."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HEADERS = {}
for line in Path("_headers").read_text().splitlines():
    if line.startswith("  ") and ":" in line:
        name, value = line.strip().split(":", 1)
        HEADERS[name] = value.strip()


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        for name, value in HEADERS.items():
            self.send_header(name, value)
        super().end_headers()


ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
