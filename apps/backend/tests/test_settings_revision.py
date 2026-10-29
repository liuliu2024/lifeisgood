import json
import sqlite3
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from life_helper.main import create_app

PATH = "/api/foundation/admin/settings"
PASSWORD = "synthetic-settings-password-123!"
DEFAULTS = {"site_name": "生活小助手", "support_email": "", "announcement": ""}


@pytest.fixture
def owner_app(tmp_path, monkeypatch):
    monkeypatch.setenv("LIFE_OWNER_EMAIL", "owner@example.test")
    monkeypatch.setenv("LIFE_OWNER_PASSWORD", PASSWORD)
    app = create_app(tmp_path)
    yield app, tmp_path
    app.state.engine.dispose()


def sign_in(client):
    result = client.post(
        "/api/auth/login", json={"email": "owner@example.test", "password": PASSWORD}
    )
    assert result.status_code == 200, result.text


def save(client, revision, name):
    return client.put(
        PATH,
        json={"expected_revision": revision, "settings": {**DEFAULTS, "site_name": name}},
    )


def publish(client, revision):
    return client.post(PATH + "/publish", json={"expected_revision": revision})


def test_revision_conflicts_preserve_draft_and_public_profile(owner_app):
    app, _ = owner_app
    with TestClient(app) as first, TestClient(app) as second:
        sign_in(first)
        sign_in(second)
        assert first.get(PATH).json()["revision"] == 0
        assert publish(first, 0).status_code == 409
        saved = save(first, 0, "第一份草稿")
        assert saved.status_code == 200
        assert saved.json()["revision"] == 1
        assert save(second, 0, "过时草稿").status_code == 409
        assert publish(second, 0).status_code == 409
        assert first.get(PATH).json()["settings"]["site_name"] == "第一份草稿"
        assert first.get("/api/site-profile").json() == DEFAULTS
        published = publish(first, 1)
        assert published.status_code == 200
        assert published.json() == {**DEFAULTS, "site_name": "第一份草稿"}
        assert publish(second, 1).json() == published.json()
        assert first.get(PATH).json()["revision"] == 1
        assert save(second, 1, "仅草稿").json()["revision"] == 2
        assert publish(first, 1).status_code == 409
        assert first.get("/api/site-profile").json() == published.json()


@pytest.mark.parametrize("revision", [None, True, False, -1, 1.0, "1", {}, []])
def test_revision_requires_nonnegative_strict_integer(owner_app, revision):
    app, _ = owner_app
    with TestClient(app) as owner:
        sign_in(owner)
        for path, data in (
            (PATH, {"expected_revision": revision, "settings": DEFAULTS}),
            (PATH + "/publish", {"expected_revision": revision}),
        ):
            assert (
                owner.request("PUT" if path == PATH else "POST", path, json=data).status_code == 422
            )
        assert owner.get(PATH).json()["revision"] == 0


def test_old_clients_cannot_blind_write_or_publish(owner_app):
    app, _ = owner_app
    with TestClient(app) as owner:
        sign_in(owner)
        assert owner.put(PATH, json={"settings": DEFAULTS}).status_code == 422
        assert owner.post(PATH + "/publish").status_code == 422
        assert owner.post(PATH + "/publish", json={}).status_code == 422
        assert owner.get(PATH).json()["revision"] == 0


def test_concurrent_put_only_one_wins_and_response_matches_written_revision(owner_app):
    app, _ = owner_app
    gate = threading.Barrier(2)
    with TestClient(app) as first, TestClient(app) as second:
        sign_in(first)
        sign_in(second)

        def racing_save(client, name):
            gate.wait(timeout=10)
            return name, save(client, 0, name)

        with ThreadPoolExecutor(max_workers=2) as pool:
            pending = [
                pool.submit(racing_save, first, "甲"),
                pool.submit(racing_save, second, "乙"),
            ]
            results = [item.result(timeout=15) for item in pending]
        assert sorted(response.status_code for _, response in results) == [200, 409]
        winner, response = next(item for item in results if item[1].status_code == 200)
        assert response.json()["revision"] == 1
        assert response.json()["settings"]["site_name"] == winner
        assert first.get(PATH).json()["settings"]["site_name"] == winner


def test_legacy_migration_is_idempotent_and_preserves_draft_and_applied(tmp_path, monkeypatch):
    monkeypatch.setenv("LIFE_OWNER_EMAIL", "owner@example.test")
    monkeypatch.setenv("LIFE_OWNER_PASSWORD", PASSWORD)
    draft = {**DEFAULTS, "announcement": "历史未发布草稿"}
    applied = {**DEFAULTS, "announcement": "历史已应用内容"}
    with sqlite3.connect(tmp_path / "foundation.sqlite3") as db:
        db.execute("CREATE TABLE settings (id INTEGER PRIMARY KEY, value TEXT NOT NULL)")
        db.executemany(
            "INSERT INTO settings VALUES(?,?)", [(1, json.dumps(draft)), (2, json.dumps(applied))]
        )
    for expected in (1, 2):
        app = create_app(tmp_path)
        try:
            with TestClient(app) as owner:
                sign_in(owner)
                saved = owner.get(PATH).json()
                assert saved["revision"] == expected
                assert saved["settings"] == draft
                assert owner.get("/api/site-profile").json() == applied
                if expected == 1:
                    result = owner.put(PATH, json={"expected_revision": 1, "settings": draft})
                    assert result.json()["revision"] == 2
        finally:
            app.state.engine.dispose()


def test_revision_endpoints_keep_server_side_permissions(owner_app):
    app, _ = owner_app
    with TestClient(app) as client:
        assert client.get(PATH).status_code == 401
        assert save(client, 0, "不可写").status_code == 401
        assert publish(client, 0).status_code == 401
        assert (
            client.post(
                "/api/auth/register", json={"email": "member@example.test", "password": PASSWORD}
            ).status_code
            == 200
        )
        assert client.get(PATH).status_code == 403
        assert save(client, 0, "不可写").status_code == 403
        assert publish(client, 0).status_code == 403
        assert client.get("/api/site-profile").json() == DEFAULTS
