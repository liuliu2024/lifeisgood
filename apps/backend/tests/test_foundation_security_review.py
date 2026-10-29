"""Independent foundation regressions; synthetic databases and uploads only."""

import asyncio
import os
import sqlite3
from contextlib import closing

import pytest
import starlette.formparsers as formparsers
from fastapi.testclient import TestClient

from life_helper.foundation import COOKIE, MAX_FILE
from life_helper.main import create_app

PASSWORD = "synthetic-security-review-password-123!"


@pytest.fixture
def reviewed_app(tmp_path, monkeypatch):
    monkeypatch.delenv("LIFE_OWNER_EMAIL", raising=False)
    monkeypatch.delenv("LIFE_OWNER_PASSWORD", raising=False)
    app = create_app(tmp_path)
    yield app, tmp_path
    app.state.engine.dispose()


def register(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "security-review@example.test", "password": PASSWORD},
    )
    assert response.status_code == 200
    return response.json()


def test_rotated_cookie_and_null_origin(reviewed_app):
    app, _ = reviewed_app
    with TestClient(app) as client:
        register(client)
        old = client.cookies.get(COOKIE)
        client.post(
            "/api/auth/login",
            json={"email": "security-review@example.test", "password": PASSWORD},
        )
        assert old != client.cookies.get(COOKIE)
        assert client.put(
            "/api/favorites/FUN-001",
            headers={"Origin": "null"},
            json={"selected": True},
        ).status_code == 403
        with TestClient(app) as replay:
            replay.cookies.set(COOKIE, old)
            assert replay.get("/api/files").status_code == 401


@pytest.mark.skipif(os.name != "nt", reason="Reproduces a native Windows open-file lock")
def test_delete_failure_preserves_retry_metadata(reviewed_app):
    app, root = reviewed_app
    with TestClient(app, raise_server_exceptions=False) as client:
        account = register(client)
        uploaded = client.post(
            "/api/files", files={"file": ("synthetic.txt", b"synthetic review")}
        ).json()["file"]
        target = root / "private_files" / account["workspace_id"] / uploaded["id"]
        with target.open("rb"):
            response = client.delete("/api/files/" + uploaded["id"])
            assert response.status_code >= 400
            with closing(sqlite3.connect(root / "foundation.sqlite3")) as db:
                rows = db.execute(
                    "SELECT COUNT(*) FROM files WHERE id=?", (uploaded["id"],)
                ).fetchone()[0]
            assert rows == 1, "Failed physical deletion must retain a retryable owned record"
        assert client.delete("/api/files/" + uploaded["id"]).status_code == 200
        assert not target.exists()


def test_chunked_body_capped_before_full_multipart_spool(reviewed_app, monkeypatch):
    app, _ = reviewed_app
    boundary = "foundation-security-review"
    header = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="synthetic.bin"\r\n'
        "Content-Type: application/octet-stream\r\n\r\n"
    ).encode()
    tail = f"\r\n--{boundary}--\r\n".encode()
    block = b"x" * (64 * 1024)
    chunks = iter([header] + [block] * 192 + [tail])  # Bounded 12 MiB synthetic request.
    stats = {"received": 0, "spooled": 0}
    statuses = []
    original_spool = formparsers.SpooledTemporaryFile

    def track_spool(*args, **kwargs):
        file = original_spool(*args, **kwargs)
        original_write = file.write

        def track_write(data):
            stats["spooled"] += len(data)
            return original_write(data)

        file.write = track_write
        return file

    monkeypatch.setattr(formparsers, "SpooledTemporaryFile", track_spool)

    async def receive():
        await asyncio.sleep(0)
        try:
            chunk = next(chunks)
        except StopIteration:
            return {"type": "http.disconnect"}
        stats["received"] += len(chunk)
        return {"type": "http.request", "body": chunk, "more_body": chunk is not tail}

    async def send(message):
        if message["type"] == "http.response.start":
            statuses.append(message["status"])

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/files",
        "raw_path": b"/api/files",
        "query_string": b"",
        "root_path": "",
        "headers": [
            (b"host", b"localhost"),
            (b"content-type", f"multipart/form-data; boundary={boundary}".encode()),
        ],
        "server": ("localhost", 80),
        "client": ("synthetic-security-review", 1234),
    }
    asyncio.run(app(scope, receive, send))
    assert statuses and statuses[0] in {401, 413}
    # Allow declared envelope budget plus one receive chunk, never the whole oversized body.
    receive_budget = MAX_FILE + 1024 * 1024 + len(block)
    assert stats["received"] <= receive_budget, stats
    assert stats["spooled"] <= receive_budget, stats
