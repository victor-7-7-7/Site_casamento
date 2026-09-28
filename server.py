"""Site e RSVP local: python server.py (apenas biblioteca padrão)."""
import argparse
import json
import os
import re
import sqlite3
import threading
import time
from collections import OrderedDict
from contextlib import closing
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent


def validate(data):
    if not isinstance(data, dict):
        raise ValueError("Resposta inválida.")
    def name(value):
        if not isinstance(value, str):
            raise ValueError("Informe nome e sobrenome.")
        value = " ".join(value.split())
        if not 5 <= len(value) <= 120 or len(value.split()) < 2 or not all(
            char.isalpha() or char in " '-’." for char in value
        ):
            raise ValueError("Informe nome e sobrenome de cada pessoa.")
        return value
    full_name = name(data.get("full_name"))
    phone = data.get("phone", "")
    if not isinstance(phone, str) or not re.fullmatch(r"\+[1-9][0-9]{9,14}", phone):
        raise ValueError("Informe um telefone válido com DDD.")
    attending = data.get("attending")
    companions = data.get("companions", [])
    count = data.get("companion_count")
    notes = data.get("notes", "")
    if type(attending) is not bool or data.get("consent") is not True:
        raise ValueError("Informe a presença e autorize o uso dos dados.")
    if not isinstance(companions, list) or len(companions) > 6 or (not attending and companions):
        raise ValueError("Confira os acompanhantes.")
    if type(count) is not int or count != len(companions):
        raise ValueError("Confira o número de acompanhantes.")
    companions = [name(value) for value in companions]
    if not isinstance(notes, str) or len(notes) > 1000:
        raise ValueError("O recado deve ter até 1000 caracteres.")
    return full_name, phone, attending, companions, notes.strip()


class WeddingServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, database):
        self.database = Path(database)
        self.database.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.database)) as db, db:
            db.execute("""CREATE TABLE IF NOT EXISTS wedding_rsvps (
                id INTEGER PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                full_name TEXT NOT NULL, normalized_name TEXT NOT NULL,
                phone TEXT NOT NULL, attending INTEGER NOT NULL,
                companions TEXT NOT NULL, notes TEXT NOT NULL,
                consent INTEGER NOT NULL CHECK(consent = 1),
                UNIQUE(phone, normalized_name))""")
        self.attempts = OrderedDict()
        self.rate_lock = threading.Lock()
        super().__init__(address, partial(Handler, directory=str(ROOT)))

    def rate_allowed(self, ip):
        now = time.monotonic()
        with self.rate_lock:
            attempts = [stamp for stamp in self.attempts.pop(ip, []) if now - stamp < 60]
            allowed = len(attempts) < 10
            if allowed:
                attempts.append(now)
            self.attempts[ip] = attempts
            while len(self.attempts) > 1024:
                self.attempts.popitem(last=False)
        return allowed


class Handler(SimpleHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, *args):
        pass  # Não registrar nomes, telefones ou conteúdo dos formulários.

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def reply(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == "/api/health":
            return self.reply(200, {"service": "wedding-rsvp", "ready": True})
        if path in ("/", "/index.html", "/style.css") or path.startswith("/assets/"):
            target = (ROOT / path.lstrip("/")).resolve()
            allowed = target == ROOT or target in (ROOT / "index.html", ROOT / "style.css")
            if path.startswith("/assets/"):
                allowed = target.is_relative_to(ROOT / "assets") and target.is_file()
            if allowed and not any(part.startswith(".") for part in Path(path).parts):
                return super().do_HEAD() if self.command == "HEAD" else super().do_GET()
        self.reply(404, {"error": "Página não encontrada."})

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != "/api/rsvp":
            return self.reply(404, {"error": "Página não encontrada."})
        # JSON + origem exata impedem submissões por formulários de outros sites.
        allowed_origins = {f"http://localhost:{self.server.server_port}",
                           f"http://127.0.0.1:{self.server.server_port}"}
        if self.headers.get("Origin") not in allowed_origins:
            return self.reply(403, {"error": "Origem não autorizada."})
        if self.headers.get_content_type() != "application/json":
            return self.reply(415, {"error": "Envie JSON."})
        if not self.server.rate_allowed(self.client_address[0]):
            return self.reply(429, {"error": "Aguarde um minuto antes de tentar novamente."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 16384:
                return self.reply(413, {"error": "Resposta muito grande ou vazia."})
            data = json.loads(self.rfile.read(length))
            full_name, phone, attending, companions, notes = validate(data)
        except (ValueError, UnicodeError):
            return self.reply(400, {"error": "Confira os campos e tente novamente."})
        try:
            with closing(sqlite3.connect(self.server.database, timeout=5)) as db, db:
                db.execute("""INSERT INTO wedding_rsvps
                    (full_name, normalized_name, phone, attending, companions, notes, consent)
                    VALUES (?, ?, ?, ?, ?, ?, 1)""",
                    (full_name, full_name.lower(), phone, int(attending),
                     json.dumps(companions, ensure_ascii=False), notes))
        except sqlite3.IntegrityError:
            return self.reply(409, {"error": "Já existe uma resposta para este nome e telefone."})
        except sqlite3.Error:
            return self.reply(503, {"error": "Não foi possível salvar. Tente novamente."})
        self.reply(201, {"saved": True})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    database = os.environ.get("WEDDING_DATABASE", str(ROOT / ".data" / "rsvps.sqlite3"))
    server = WeddingServer(("127.0.0.1", args.port), database)
    print(f"Site: http://localhost:{server.server_port} — Ctrl+C para encerrar.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
