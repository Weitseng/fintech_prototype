import http.server
import os

PORT = 8734
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(ROOT)
    http.server.HTTPServer(('', PORT), NoCacheHandler).serve_forever()
