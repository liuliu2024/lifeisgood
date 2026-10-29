import asyncio
import hashlib
import sqlite3
import time

import pytest
from fastapi.testclient import TestClient

from life_helper.foundation import COOKIE, MAX_FILE
from life_helper.main import create_app

PASSWORD = "synthetic-test-password-123!"


@pytest.fixture
def foundation(tmp_path, monkeypatch):
    monkeypatch.delenv("LIFE_OWNER_EMAIL", raising=False)
    monkeypatch.delenv("LIFE_OWNER_PASSWORD", raising=False)
    return create_app(tmp_path), tmp_path


def register(client, email="alice@example.test"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": PASSWORD,
            "display_name": "合成测试店铺",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_registration_private_and_no_implicit_owner(foundation):
    app, root = foundation
    with TestClient(app) as client:
        assert client.get("/api/account").json() == {
            "authenticated": False,
            "user": None,
            "workspace_id": None,
        }
        for path in (
            "/api/files",
            "/api/favorites",
            "/api/foundation/jobs",
            "/api/foundation/admin/settings",
        ):
            assert client.get(path).status_code == 401
        anonymous_id = client.post("/api/session").json()["workspace_id"]
        account = register(client)
        assert account["user"]["role"] == "member"
        assert account["workspace_id"] != anonymous_id
        assert client.get("/api/foundation/admin/settings").status_code == 403
        assert (
            client.put("/api/foundation/admin/settings", json={"settings": {}}).status_code == 403
        )
        assert client.get("/api/foundation/jobs").json() == {"jobs": []}
        cookie_header = client.post(
            "/api/auth/login",
            json={
                "email": "alice@example.test",
                "password": PASSWORD,
            },
        ).headers["set-cookie"]
        assert "HttpOnly" in cookie_header and "SameSite=lax" in cookie_header
        raw_token = client.cookies.get(COOKIE)
        with sqlite3.connect(root / "foundation.sqlite3") as db:
            password_hash = db.execute("SELECT password_hash FROM accounts").fetchone()[0]
            token_hash = db.execute("SELECT token_hash FROM sessions").fetchone()[0]
        assert PASSWORD not in password_hash and password_hash.startswith("pbkdf2_sha256$600000$")
        assert token_hash != raw_token
        assert token_hash == hashlib.sha256(raw_token.encode()).hexdigest()


def test_private_files_and_favorites_are_isolated(foundation):
    app, root = foundation
    with TestClient(app) as alice, TestClient(app) as bob:
        register(alice)
        register(bob, "bob@example.test")
        for _ in range(2):
            assert alice.put("/api/favorites/FUN-001", json={"selected": True}).json() == {
                "capability_ids": ["FUN-001"],
            }
        assert bob.get("/api/favorites").json() == {"capability_ids": []}
        assert alice.put("/api/favorites/FUN-999", json={"selected": True}).status_code == 422
        uploaded = alice.post(
            "/api/files",
            files={
                "file": ("../../店铺<script>.html", b"<script>synthetic</script>", "text/html"),
            },
        ).json()["file"]
        assert uploaded["name"] == "店铺<script>.html"
        assert "workspace_id" not in uploaded
        assert len(alice.get("/api/files").json()["files"]) == 1
        download = alice.get(uploaded["download_url"])
        assert download.status_code == 200
        assert download.headers["content-type"] == "application/octet-stream"
        assert download.headers["content-disposition"].startswith("attachment;")
        assert download.headers["x-content-type-options"] == "nosniff"
        assert bob.get("/api/files").json()["files"] == []
        assert bob.get(uploaded["download_url"]).status_code == 404
        assert bob.delete("/api/files/" + uploaded["id"]).status_code == 404
        assert alice.delete("/api/files/" + uploaded["id"]).json() == {"deleted": True}
        assert alice.get(uploaded["download_url"]).status_code == 404
        assert not list((root / "private_files").rglob(uploaded["id"]))
        assert alice.put("/api/favorites/FUN-001", json={"selected": False}).json() == {
            "capability_ids": [],
        }


def test_logout_revocation_expiry_and_restart_persistence(foundation):
    app, root = foundation
    with TestClient(app) as client:
        original = register(client)
        client.put("/api/favorites/FUN-002", json={"selected": True})
        uploaded = client.post("/api/files", files={"file": ("test.txt", b"persistent")}).json()
        cookie = client.cookies.get(COOKIE)
    rebuilt = create_app(root)
    with TestClient(rebuilt) as client:
        client.cookies.set(COOKIE, cookie)
        assert client.get("/api/account").json() == original
        assert client.get("/api/favorites").json()["capability_ids"] == ["FUN-002"]
        assert client.get(uploaded["file"]["download_url"]).content == b"persistent"
        assert client.post("/api/auth/logout").json()["authenticated"] is False
        client.cookies.set(COOKIE, cookie)
        assert client.get("/api/files").status_code == 401
        assert (
            client.post(
                "/api/auth/login",
                json={
                    "email": "alice@example.test",
                    "password": PASSWORD,
                },
            ).status_code
            == 200
        )
        with sqlite3.connect(root / "foundation.sqlite3") as db:
            db.execute("UPDATE sessions SET expires_at=?", (time.time() - 1,))
        assert client.get("/api/account").json()["authenticated"] is False


def test_owner_is_explicit_and_cannot_enable_providers(foundation, monkeypatch):
    _, root = foundation
    monkeypatch.setenv("LIFE_OWNER_EMAIL", "owner@example.test")
    monkeypatch.setenv("LIFE_OWNER_PASSWORD", PASSWORD)
    app = create_app(root)
    with TestClient(app) as owner:
        assert (
            owner.post(
                "/api/auth/login",
                json={
                    "email": "owner@example.test",
                    "password": PASSWORD,
                },
            ).json()["user"]["role"]
            == "owner"
        )
        settings = {
            "site_name": "测试经营工具站",
            "support_email": "help@example.test",
            "announcement": "仅底座预览",
        }
        result = owner.put("/api/foundation/admin/settings", json={"settings": settings})
        assert result.status_code == 200
        assert result.json()["billable_calls_enabled"] is False
        assert result.json()["tools_enabled"] is False
        assert (
            owner.put(
                "/api/foundation/admin/settings",
                json={
                    "settings": {"api_key": "must-not-be-accepted"},
                },
            ).status_code
            == 422
        )
    with TestClient(create_app(root)) as owner:
        owner.post("/api/auth/login", json={"email": "owner@example.test", "password": PASSWORD})
        assert owner.get("/api/foundation/admin/settings").json()["settings"] == settings


def test_auth_validation_throttling_and_source_guard(foundation):
    app, root = foundation
    with TestClient(app) as client:
        password = "x" * 129
        result = client.post(
            "/api/auth/register", json={"email": "bad@example.test", "password": password}
        )
        assert result.status_code == 422 and password not in result.text
        assert (
            client.post(
                "/api/auth/register",
                json={
                    "email": "bad@example.test",
                    "password": "short",
                },
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/api/auth/register",
                json={
                    "email": "bad@example.test",
                    "password": PASSWORD,
                    "role": "owner",
                },
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/api/auth/register",
                headers={"origin": "https://attacker.invalid"},
                json={"email": "bad@example.test", "password": PASSWORD},
            ).status_code
            == 403
        )
        register(client)
        for headers in ({"origin": "null"}, {"sec-fetch-site": "cross-site"}):
            assert client.post("/api/auth/logout", headers=headers).status_code == 403
        responses = [
            client.post(
                "/api/auth/login",
                json={
                    "email": "alice@example.test",
                    "password": "wrong-long-password",
                },
            )
            for _ in range(12)
        ]
        assert all(response.status_code == 401 for response in responses[:11])
        assert responses[-1].status_code == 429
    with TestClient(create_app(root)) as client:
        assert (
            client.post(
                "/api/auth/login",
                json={
                    "email": "alice@example.test",
                    "password": PASSWORD,
                },
            ).status_code
            == 429
        )


def test_upload_limit_does_not_leave_file(foundation):
    app, root = foundation
    with TestClient(app) as client:
        register(client)
        assert (
            client.post(
                "/api/files",
                files={
                    "file": ("too-big.bin", b"x" * (MAX_FILE + 1)),
                },
            ).status_code
            == 413
        )
        assert client.get("/api/files").json() == {"files": []}
        assert not [path for path in (root / "private_files").rglob("*") if path.is_file()]


def test_existing_member_cannot_be_promoted_by_environment(foundation, monkeypatch):
    app, root = foundation
    with TestClient(app) as client:
        register(client)
    monkeypatch.setenv("LIFE_OWNER_EMAIL", "alice@example.test")
    monkeypatch.setenv("LIFE_OWNER_PASSWORD", PASSWORD)
    with pytest.raises(ValueError, match="自动提权"):
        create_app(root)


@pytest.mark.parametrize("declared_length", [None, b"1"])
def test_authenticated_upload_limits_actual_stream_and_closes_buffer(
    foundation, monkeypatch, declared_length
):
    from life_helper import request_limits

    app, root = foundation
    with TestClient(app) as client:
        register(client)
        cookie = client.cookies.get(COOKIE)
    buffers = []
    spool = request_limits.SpooledTemporaryFile

    def track_buffer(*args, **kwargs):
        buffer = spool(*args, **kwargs)
        buffers.append(buffer)
        return buffer

    monkeypatch.setattr(request_limits, "SpooledTemporaryFile", track_buffer)
    header = (
        b'--bounded\r\nContent-Disposition: form-data; name="file"; filename="test.bin"'
        b"\r\nContent-Type: application/octet-stream\r\n\r\n"
    )
    chunks = iter([header] + [b"x" * 65536] * 192 + [b"\r\n--bounded--\r\n"])
    stats = {"received": 0}
    statuses = []

    async def receive():
        await asyncio.sleep(0)
        chunk = next(chunks, None)
        if chunk is None:
            return {"type": "http.disconnect"}
        stats["received"] += len(chunk)
        return {"type": "http.request", "body": chunk, "more_body": True}

    async def send(message):
        if message["type"] == "http.response.start":
            statuses.append(message["status"])

    headers = [
        (b"host", b"localhost"),
        (b"cookie", f"{COOKIE}={cookie}".encode()),
        (b"content-type", b"multipart/form-data; boundary=bounded"),
    ]
    if declared_length is not None:
        headers.append((b"content-length", declared_length))
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
        "headers": headers,
        "server": ("localhost", 80),
        "client": ("synthetic", 123),
    }
    asyncio.run(app(scope, receive, send))
    assert statuses == [413]
    assert stats["received"] <= MAX_FILE + 1024 * 1024 + 65536
    assert buffers and all(buffer.closed for buffer in buffers)
    assert not list((root / "private_files").rglob("*"))


def test_database_failure_after_physical_delete_can_be_retried(foundation):
    app, root = foundation
    with TestClient(app, raise_server_exceptions=False) as client:
        account = register(client)
        uploaded = client.post("/api/files", files={"file": ("test.txt", b"synthetic")}).json()[
            "file"
        ]
        database_path = root / "foundation.sqlite3"
        with sqlite3.connect(database_path) as db:
            db.execute(
                "CREATE TRIGGER fail_delete BEFORE DELETE ON files "
                "BEGIN SELECT RAISE(ABORT, 'synthetic deletion failure'); END"
            )
        assert client.delete("/api/files/" + uploaded["id"]).status_code == 500
        assert client.get("/api/files").json()["files"][0]["id"] == uploaded["id"]
        assert not (root / "private_files" / account["workspace_id"] / uploaded["id"]).exists()
        with sqlite3.connect(database_path) as db:
            db.execute("DROP TRIGGER fail_delete")
        assert client.delete("/api/files/" + uploaded["id"]).status_code == 200
        assert client.get("/api/files").json() == {"files": []}
