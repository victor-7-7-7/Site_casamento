"""Verificação sem dependências: python -m unittest discover -s tests -v."""
import concurrent.futures
import http.client
import json
import os
import re
import sqlite3
import subprocess
import shutil
import uuid
from contextlib import closing
import threading
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import ROOT, Handler, WeddingServer


class TestDirectory:
    def __init__(self):
        self.path = ROOT / ".data" / ("test-" + uuid.uuid4().hex)
        self.path.mkdir(parents=True)
        self.name = str(self.path)

    def cleanup(self):
        target = self.path.resolve()
        assert target.is_relative_to((ROOT / ".data").resolve()) and target.name.startswith("test-")
        shutil.rmtree(target)

    def __enter__(self):
        return self.name

    def __exit__(self, *args):
        self.cleanup()


class SiteTests(unittest.TestCase):
    def setUp(self):
        self.temp = TestDirectory()
        self.server = WeddingServer(("127.0.0.1", 0), Path(self.temp.name) / "responses.sqlite3")
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path="/api/rsvp", payload=None, origin=True, method=None):
        client = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=10)
        headers = {"Content-Type": "application/json"}
        if origin:
            headers["Origin"] = f"http://127.0.0.1:{self.server.server_port}"
        client.request(method or ("POST" if payload is not None else "GET"), path,
                       json.dumps(payload) if payload is not None else None, headers)
        response = client.getresponse()
        result = response.status, response.read()
        client.close()
        return result

    def payload(self, **changes):
        return {"full_name": "Convidada Exemplo", "phone": "+5511999999999", "attending": True,
                "companion_count": 1, "companions": ["Convidado Exemplo"], "notes": "Sem lactose",
                "consent": True, **changes}

    def test_response_persists_and_duplicate_is_rejected(self):
        self.assertEqual(self.request(payload=self.payload())[0], 201)
        self.assertEqual(self.request(payload=self.payload(full_name="  convidada   exemplo  "))[0], 409)
        with closing(sqlite3.connect(self.server.database)) as db:
            row = db.execute("SELECT full_name, companions, consent FROM wedding_rsvps").fetchone()
        self.assertEqual(row, ("Convidada Exemplo", '["Convidado Exemplo"]', 1))

    def test_simultaneous_duplicate(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: self.request(payload=self.payload())[0], range(2)))
        self.assertEqual(sorted(results), [201, 409])

    def test_declining_and_shared_phone(self):
        self.assertEqual(self.request(payload=self.payload(attending=False, companions=[], companion_count=0))[0], 201)
        self.assertEqual(self.request(payload=self.payload(full_name="Outra Pessoa"))[0], 201)

    def test_invalid_input(self):
        for change in [{"consent": False}, {"phone": "+0011999999999"}, {"full_name": "<script>"},
                       {"attending": "yes"}, {"companion_count": 2}, {"attending": False},
                       {"companions": [None]}, {"notes": "x" * 1001}]:
            with self.subTest(change=change):
                self.assertEqual(self.request(payload=self.payload(**change))[0], 400)

    def test_cross_origin_and_read_access(self):
        self.assertEqual(self.request(payload=self.payload(), origin=False)[0], 403)
        for path in ["/api/rsvp", "/.data/responses.sqlite3", "/server.py", "/supabase/setup.sql",
                     "/assets/../server.py", "/assets/%2e%2e/server.py", "/assets/"]:
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)
        for path in ["/", "/index.html", "/style.css", "/assets/scripts/app.js", "/api/health"]:
            self.assertEqual(self.request(path)[0], 200)
        self.assertEqual(self.request("/", method="HEAD"), (200, b""))

    def test_rate_limit(self):
        for _ in range(10):
            self.request(payload={})
        self.assertEqual(self.request(payload=self.payload())[0], 429)


BROWSER_SCRIPT = r"""
window.addEventListener('load', async () => {
  const results = [];
  const check = (value, text) => { if (!value) throw Error(text); results.push(text); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  try {
    check(document.querySelectorAll('#gift-list article').length === 4, 'presentes');
    document.querySelector('[data-filter=ganhamos]').click();
    check(document.querySelectorAll('#gift-list article').length === 1, 'filtros');
    document.querySelector('.gallery-open').click();
    check(document.querySelector('#gallery-dialog').open, 'galeria');
    document.querySelector('#gallery-next').click();
    check(document.querySelector('#gallery-position').textContent === '2 / 4', 'navegacao de fotos');
    document.querySelector('#close-gallery').click();
    check(document.activeElement.classList.contains('gallery-open'), 'foco restaurado');
    document.querySelector('#open-envelope').click();
    check(!document.querySelector('#invitation-card').inert, 'convite acessivel');
    document.querySelector('#symbolic-list button').click();
    check(document.querySelector('#pix-dialog').open && document.querySelector('#copy-pix').disabled, 'pix sem chave');
    document.querySelector('#close-pix').click();
    check(!document.querySelector('#save-date').hidden && +document.querySelector('#days').textContent > 0, 'data e calendario');
    if (innerWidth <= 760) {
      document.querySelector('.menu-toggle').click();
      check(document.querySelector('#menu').classList.contains('open'), 'menu movel');
      document.querySelector('#menu a').click();
    }
    check(document.documentElement.scrollWidth <= innerWidth, 'sem overflow');
    for (let i = 0; i < 40 && document.querySelector('#rsvp-submit').disabled; i++) await pause(100);
    check(!document.querySelector('#rsvp-submit').disabled, 'rsvp local disponivel');
    document.querySelector('#full-name').value = 'Convidada Navegador';
    document.querySelector('#phone').value = '11999999999';
    document.querySelector('input[name=attending][value=yes]').click();
    document.querySelector('#companion-count').value = '1';
    document.querySelector('#companion-count').dispatchEvent(new Event('change'));
    document.querySelector('#companion-0').value = 'Acompanhante Navegador';
    document.querySelector('input[name=consent]').checked = true;
    document.querySelector('#rsvp-form').requestSubmit();
    for (let i = 0; i < 80 && !document.querySelector('#rsvp-status').className; i++) await pause(100);
    check(document.querySelector('#rsvp-status').classList.contains('success'), 'rsvp salvo de verdade');
    check(window.testErrors.length === 0, 'sem erros JavaScript');
    document.body.dataset.testResult = 'PASS';
    document.body.dataset.testChecks = results.join(', ');
  } catch (error) { document.body.dataset.testResult = 'FAIL: ' + error.message; }
});
"""


class BrowserHandler(Handler):
    def do_GET(self):
        if self.path == "/":
            html = (ROOT / "index.html").read_text(encoding="utf-8")
            html = re.sub(r"<link[^>]+https://fonts[^>]+>", "", html)
            html = html.replace("<head>", "<head><script>window.testErrors=[];window.addEventListener('error',e=>testErrors.push(e.message));</script>")
            html = html.replace("</body>", "<script>" + BROWSER_SCRIPT + "</script></body>")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
        elif self.path == "/assets/scripts/config.js":
            config = (ROOT / "assets/scripts/config.js").read_text(encoding="utf-8")
            config = re.sub(r"https://images\.unsplash\.com/[^']+", "assets/images/foto-placeholder.svg", config)
            config += "\nwindow.WEDDING_CONFIG.dateISO='2099-10-16T16:00:00-03:00';"
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.end_headers()
            self.wfile.write(config.encode("utf-8"))
        else:
            super().do_GET()


class BrowserTests(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("RUN_BROWSER_TESTS") == "1", "Verificação visual opcional: RUN_BROWSER_TESTS=1")
    def test_browser(self):
        browsers = [Path("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"),
                    Path("C:/Program Files/Google/Chrome/Application/chrome.exe")]
        browser = next((path for path in browsers if path.exists()), None)
        if browser is None:
            self.skipTest("Edge/Chrome não instalado no caminho padrão; execute a revisão manual do README.")
        for width in [320, 768, 1440]:
            with self.subTest(width=width), TestDirectory() as folder:
                from functools import partial
                server = WeddingServer(("127.0.0.1", 0), Path(folder) / "responses.sqlite3")
                server.RequestHandlerClass = partial(BrowserHandler, directory=str(ROOT))
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                try:
                    output = Path(folder) / "browser.html"
                    errors = Path(folder) / "browser.log"
                    with output.open("w", encoding="utf-8") as out, errors.open("w", encoding="utf-8") as err:
                        subprocess.run([str(browser), "--headless", "--disable-gpu", "--no-first-run",
                            "--disable-background-networking", "--disable-extensions", "--no-default-browser-check",
                            f"--user-data-dir={folder}/browser", f"--window-size={width},1000",
                            "--virtual-time-budget=15000", "--dump-dom", f"http://127.0.0.1:{server.server_port}"],
                            stdout=out, stderr=err, timeout=45)
                    match = re.search(r'data-test-result="([^"]+)"', output.read_text(encoding="utf-8"))
                    self.assertIsNotNone(match, errors.read_text(encoding="utf-8", errors="replace")[-1500:])
                    self.assertEqual(match.group(1), "PASS")
                    with closing(sqlite3.connect(server.database)) as db:
                        self.assertEqual(db.execute("SELECT COUNT(*) FROM wedding_rsvps").fetchone()[0], 1)
                finally:
                    server.shutdown()
                    server.server_close()
                    thread.join()


if __name__ == "__main__":
    unittest.main()
