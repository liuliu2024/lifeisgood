"""Independent F review: concurrent owners and legacy database preservation."""

import json
import sqlite3
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from life_helper.main import create_app

SETTINGS = "/api/foundation/admin/settings"
PUBLISH = SETTINGS + "/publish"
PASSWORD = "synthetic-review-owner-password-2026"


@pytest.fixture
def reviewed_app(tmp_path, monkeypatch):
    monkeypatch.setenv("LIFE_OWNER_EMAIL", "review-owner@example.test")
    monkeypatch.setenv("LIFE_OWNER_PASSWORD", PASSWORD)
    app = create_app(tmp_path)
    yield app, tmp_path
    app.state.engine.dispose()


def authenticate(client):
    result = client.post(
        "/api/auth/login",
        json={"email": "review-owner@example.test", "password": PASSWORD},
    )
    assert result.status_code == 200


def test_independent_same_revision_race_returns_only_own_committed_snapshot(reviewed_app):
    app, _ = reviewed_app
    with TestClient(app) as first, TestClient(app) as second:
        authenticate(first)
        authenticate(second)
        snapshot = first.get(SETTINGS).json()
        expected = snapshot["revision"]
        original_public = first.get("/api/site-profile").json()
        gate = threading.Barrier(2)
        drafts = [
            {**snapshot["settings"], "site_name": "合成甲草稿"},
            {**snapshot["settings"], "site_name": "合成乙草稿"},
        ]

        def save(client, draft):
            gate.wait(timeout=10)
            return client.put(SETTINGS, json={"settings": draft, "expected_revision": expected})

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(save, client, draft)
                for client, draft in zip((first, second), drafts, strict=True)
            ]
            results = [future.result(timeout=20) for future in futures]
        assert sorted(result.status_code for result in results) == [200, 409]
        winner = next(i for i, result in enumerate(results) if result.status_code == 200)
        assert results[winner].json()["settings"] == drafts[winner]
        assert results[winner].json()["revision"] == expected + 1
        assert first.get(SETTINGS).json()["settings"] == drafts[winner]
        assert first.get("/api/site-profile").json() == original_public
        stale = first.post(PUBLISH, json={"expected_revision": expected})
        assert stale.status_code == 409
        assert first.get("/api/site-profile").json() == original_public
        published = first.post(PUBLISH, json={"expected_revision": expected + 1})
        assert published.status_code == 200
        assert published.json() == drafts[winner]
        assert set(published.json()) == {"site_name", "support_email", "announcement"}
        assert first.get(SETTINGS).json()["revision"] == expected + 1


def test_independent_legacy_migration_retains_separate_values_and_monotonic_version(
    tmp_path, monkeypatch
):
    monkeypatch.setenv("LIFE_OWNER_EMAIL", "review-owner@example.test")
    monkeypatch.setenv("LIFE_OWNER_PASSWORD", PASSWORD)
    draft = {"site_name": "旧草稿", "support_email": "", "announcement": "未公开"}
    public = {"site_name": "旧公开站点", "support_email": "", "announcement": "已公开"}
    with sqlite3.connect(tmp_path / "foundation.sqlite3") as db:
        db.execute("CREATE TABLE settings (id INTEGER PRIMARY KEY, value TEXT NOT NULL)")
        db.executemany(
            "INSERT INTO settings VALUES (?, ?)",
            [(1, json.dumps(draft)), (2, json.dumps(public))],
        )
    app = create_app(tmp_path)
    try:
        with TestClient(app) as client:
            authenticate(client)
            assert client.get(SETTINGS).json()["revision"] == 1
            assert client.get(SETTINGS).json()["settings"] == draft
            assert client.get("/api/site-profile").json() == public
            newer = {**draft, "announcement": "第二版仍未公开"}
            saved = client.put(SETTINGS, json={"settings": newer, "expected_revision": 1})
            assert saved.status_code == 200
            assert saved.json()["revision"] == 2
    finally:
        app.state.engine.dispose()
    rebuilt = create_app(tmp_path)
    try:
        with TestClient(rebuilt) as client:
            authenticate(client)
            assert client.get(SETTINGS).json()["revision"] == 2
            assert client.get(SETTINGS).json()["settings"] == newer
            assert client.get("/api/site-profile").json() == public
            assert client.post(PUBLISH, json={"expected_revision": 1}).status_code == 409
            assert client.get("/api/site-profile").json() == public
    finally:
        rebuilt.state.engine.dispose()


def test_independent_invalid_or_missing_revision_never_writes(reviewed_app):
    app, _ = reviewed_app
    with TestClient(app) as client:
        authenticate(client)
        before = client.get(SETTINGS).json()
        public = client.get("/api/site-profile").json()
        modified = {**before["settings"], "site_name": "不应被保存"}
        for invalid in (True, False, 0.0, "0", -1, None):
            assert (
                client.put(
                    SETTINGS, json={"settings": modified, "expected_revision": invalid}
                ).status_code
                == 422
            )
            assert client.post(PUBLISH, json={"expected_revision": invalid}).status_code == 422
        assert client.put(SETTINGS, json={"settings": modified}).status_code == 422
        assert client.post(PUBLISH).status_code == 422
        assert client.post(PUBLISH, json={"expected_revision": 0}).status_code == 409
        assert client.get(SETTINGS).json() == before
        assert client.get("/api/site-profile").json() == public
