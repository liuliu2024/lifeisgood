import sqlite3
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from life_helper import foundation
from life_helper.foundation import COOKIE
from life_helper.main import create_app

OLD_PASSWORD = "synthetic-old-password-123!"
NEW_PASSWORD = "synthetic-new-password-456!"
EMAIL = "member@example.test"


@pytest.fixture
def private_app(tmp_path, monkeypatch):
    monkeypatch.delenv("LIFE_OWNER_EMAIL", raising=False)
    monkeypatch.delenv("LIFE_OWNER_PASSWORD", raising=False)
    app = create_app(tmp_path)
    yield app, tmp_path
    app.state.engine.dispose()


def register(client, email=EMAIL):
    result = client.post("/api/auth/register", json={"email": email, "password": OLD_PASSWORD})
    assert result.status_code == 200, result.text
    return result.json()


def login(client, password=OLD_PASSWORD, email=EMAIL):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def change(client, current=OLD_PASSWORD, new=NEW_PASSWORD):
    return client.post(
        "/api/auth/password", json={"current_password": current, "new_password": new}
    )


def test_password_requires_current_authentication_and_correct_password(private_app):
    app, root = private_app
    with TestClient(app) as client:
        assert change(client).status_code == 401
        original = register(client)
        old_cookie = client.cookies.get(COOKIE)
        result = change(client, current="synthetic-wrong-password")
        assert result.status_code == 401
        assert OLD_PASSWORD not in result.text and NEW_PASSWORD not in result.text
        assert client.get("/api/account").json() == original
        assert client.cookies.get(COOKIE) == old_cookie
        assert login(client).status_code == 200
        assert login(client, NEW_PASSWORD).status_code == 401
        with sqlite3.connect(root / "foundation.sqlite3") as db:
            stored = db.execute("SELECT password_hash FROM accounts").fetchone()[0]
        assert foundation.password_matches(OLD_PASSWORD, stored)


def test_password_rotation_revokes_all_old_sessions_and_persists(private_app):
    app, root = private_app
    with TestClient(app) as active, TestClient(app) as other, TestClient(app) as unrelated:
        original = register(active)
        assert login(other).status_code == 200
        unrelated_account = register(unrelated, "other@example.test")
        old_cookies = [active.cookies.get(COOKIE), other.cookies.get(COOKIE)]
        with sqlite3.connect(root / "foundation.sqlite3") as db:
            old_hash = db.execute(
                "SELECT password_hash FROM accounts WHERE email=?", (EMAIL,)
            ).fetchone()[0]
        result = change(active)
        assert result.status_code == 200 and result.json() == original
        assert result.json()["user"]["role"] == "member"
        new_cookie = active.cookies.get(COOKIE)
        assert new_cookie not in old_cookies
        assert "HttpOnly" in result.headers["set-cookie"]
        assert unrelated.get("/api/account").json() == unrelated_account
        for old_cookie in old_cookies:
            with TestClient(app) as replay:
                replay.cookies.set(COOKIE, old_cookie)
                assert replay.get("/api/account").json()["authenticated"] is False
                assert replay.get("/api/files").status_code == 401
        assert other.get("/api/files").status_code == 401
        assert login(other).status_code == 401
        with sqlite3.connect(root / "foundation.sqlite3") as db:
            stored = db.execute(
                "SELECT password_hash FROM accounts WHERE email=?", (EMAIL,)
            ).fetchone()[0]
            sessions = db.execute(
                "SELECT count(*) FROM sessions WHERE user_id=?", (original["user"]["id"],)
            ).fetchone()[0]
        assert stored != old_hash and foundation.password_matches(NEW_PASSWORD, stored)
        assert sessions == 1
    rebuilt = create_app(root)
    try:
        with TestClient(rebuilt) as client:
            client.cookies.set(COOKIE, new_cookie)
            assert client.get("/api/account").json() == original
            assert login(client, NEW_PASSWORD).status_code == 200
            assert client.get("/api/foundation/admin/settings").status_code == 403
    finally:
        rebuilt.state.engine.dispose()


def test_password_validation_never_reflects_private_input_or_accepts_role(private_app):
    app, _ = private_app
    with TestClient(app) as client:
        register(client)
        for payload in (
            {"current_password": OLD_PASSWORD, "new_password": "x" * 129},
            {"current_password": OLD_PASSWORD, "new_password": NEW_PASSWORD, "role": "owner"},
        ):
            result = client.post("/api/auth/password", json=payload)
            assert result.status_code == 422
            assert OLD_PASSWORD not in result.text and NEW_PASSWORD not in result.text
            assert "x" * 129 not in result.text
        assert client.get("/api/account").json()["user"]["role"] == "member"


def test_password_failures_share_persistent_auth_throttle(private_app):
    app, root = private_app
    with TestClient(app) as client:
        register(client)
        cookie = client.cookies.get(COOKIE)
        results = [change(client, current="synthetic-wrong-password") for _ in range(12)]
        assert all(result.status_code == 401 for result in results[:11])
        assert results[-1].status_code == 429
    rebuilt = create_app(root)
    try:
        with TestClient(rebuilt) as client:
            client.cookies.set(COOKIE, cookie)
            assert change(client).status_code == 429
    finally:
        rebuilt.state.engine.dispose()


def test_login_verified_before_password_change_cannot_create_late_session(private_app, monkeypatch):
    app, _ = private_app
    verified = threading.Event()
    release = threading.Event()
    gate = threading.Lock()
    first_check = True
    original_matches = foundation.password_matches

    def delayed_match(password, stored):
        nonlocal first_check
        result = original_matches(password, stored)
        with gate:
            delay = first_check
            first_check = False
        if delay:
            verified.set()
            assert release.wait(timeout=10), "synthetic login race was not released"
        return result

    with TestClient(app) as active, TestClient(app) as racing:
        register(active)
        monkeypatch.setattr(foundation, "password_matches", delayed_match)
        with ThreadPoolExecutor(max_workers=1) as executor:
            pending = executor.submit(login, racing)
            try:
                assert verified.wait(timeout=10)
                assert change(active).status_code == 200
            finally:
                release.set()
            assert pending.result(timeout=10).status_code == 401
        assert racing.get("/api/account").json()["authenticated"] is False
        assert active.get("/api/account").json()["authenticated"] is True


def test_site_profile_draft_publish_permissions_and_restart(private_app, monkeypatch):
    app, root = private_app
    defaults = {"site_name": "生活小助手", "support_email": "", "announcement": ""}
    with TestClient(app) as public:
        assert public.get("/api/site-profile").json() == defaults
        assert public.post("/api/foundation/admin/settings/publish").status_code == 401
        register(public)
        assert public.post("/api/foundation/admin/settings/publish").status_code == 403
        assert public.get("/api/site-profile").json() == defaults
    monkeypatch.setenv("LIFE_OWNER_EMAIL", "owner@example.test")
    monkeypatch.setenv("LIFE_OWNER_PASSWORD", OLD_PASSWORD)
    owner_app = create_app(root)
    published = {
        "site_name": "合成经营工具站",
        "support_email": "support@example.test",
        "announcement": "已应用的公开说明",
    }
    newer_draft = {**published, "announcement": "仅站长可见的未应用草稿"}
    try:
        with TestClient(owner_app) as owner, TestClient(owner_app) as public:
            assert login(owner, email="owner@example.test").status_code == 200
            assert (
                owner.put(
                    "/api/foundation/admin/settings", json={"settings": published}
                ).status_code
                == 200
            )
            assert public.get("/api/site-profile").json() == defaults
            assert owner.post("/api/foundation/admin/settings/publish").json() == published
            assert public.get("/api/site-profile").json() == published
            assert (
                owner.put(
                    "/api/foundation/admin/settings", json={"settings": newer_draft}
                ).status_code
                == 200
            )
            assert public.get("/api/site-profile").json() == published
            changed = change(owner)
            assert changed.status_code == 200 and changed.json()["user"]["role"] == "owner"
    finally:
        owner_app.state.engine.dispose()
    rebuilt = create_app(root)
    try:
        with TestClient(rebuilt) as owner:
            assert owner.get("/api/site-profile").json() == published
            assert login(owner, NEW_PASSWORD, "owner@example.test").status_code == 200
            draft = owner.get("/api/foundation/admin/settings").json()
            assert draft["settings"] == newer_draft
            assert draft["billable_calls_enabled"] is False and draft["tools_enabled"] is False
            assert set(owner.get("/api/site-profile").json()) == set(defaults)
    finally:
        rebuilt.state.engine.dispose()
