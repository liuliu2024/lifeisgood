import json
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from life_helper import component_registry
from life_helper.main import create_app

PASSWORD = "synthetic-component-test-123!"
OWNER_EMAIL = "component-owner@example.test"
ADMIN = "/api/foundation/admin/components"
PUBLIC = "/api/component-catalog"


@pytest.fixture
def registry(tmp_path, monkeypatch):
    seed = {
        "modules": [{"id": "life", "title": "生活"}, {"id": "creative", "title": "创意"}],
        "items": [
            {
                "id": "DAILY-001",
                "title": "原始头像",
                "description": "几何图案",
                "module_ids": ["creative"],
                "sort_order": 1,
                "hidden": False,
                "archived": False,
                "kind": "tool",
                "tool_key": "avatar",
            },
            {
                "id": "FUN-001",
                "title": "原始候选",
                "description": "等待试配",
                "module_ids": ["life"],
                "sort_order": 2,
                "hidden": False,
                "archived": False,
                "kind": "candidate",
            },
        ],
        "ready_tool_paths": {"avatar": "/tools/avatar"},
    }
    seed_path = tmp_path / "component-seed.json"
    seed_path.write_text(json.dumps(seed), encoding="utf-8")
    monkeypatch.setattr(component_registry, "SEED_PATH", seed_path)
    monkeypatch.setenv("LIFE_OWNER_EMAIL", OWNER_EMAIL)
    monkeypatch.setenv("LIFE_OWNER_PASSWORD", PASSWORD)
    app_root = tmp_path / "data"
    return create_app(app_root), app_root, seed_path


def login_owner(client):
    response = client.post("/api/auth/login", json={"email": OWNER_EMAIL, "password": PASSWORD})
    assert response.status_code == 200, response.text


def component_payload(revision=0, **changes):
    return {
        "expected_revision": revision,
        "title": "合成组件",
        "description": "只用于测试",
        "module_ids": ["life"],
        "sort_order": 3,
        "hidden": False,
        "kind": "candidate",
        **changes,
    }


def edit_payload(item, revision, **changes):
    return {key: value for key, value in item.items() if key not in {"id", "path"}} | {
        "expected_revision": revision,
        **changes,
    }


def test_public_catalog_and_owner_only_writes(registry):
    app, _, _ = registry
    with TestClient(app) as anonymous, TestClient(app) as member:
        public = anonymous.get(PUBLIC)
        assert public.status_code == 200
        assert public.headers["cache-control"] == "no-store"
        assert public.json()["revision"] == 0
        avatar, candidate = public.json()["items"]
        assert avatar["path"] == "/tools/avatar"
        assert "path" not in candidate
        assert "hidden" not in avatar and "archived" not in avatar
        assert "tool_options" not in public.json()
        assert anonymous.get(ADMIN).status_code == 401
        assert anonymous.post(ADMIN, json=component_payload()).status_code == 401
        assert (
            anonymous.put(ADMIN + "/FUN-001", json=component_payload(archived=False)).status_code
            == 401
        )
        assert (
            anonymous.request(
                "DELETE", ADMIN + "/FUN-001", json={"expected_revision": 0}
            ).status_code
            == 401
        )
        assert (
            member.post(
                "/api/auth/register", json={"email": "member@example.test", "password": PASSWORD}
            ).status_code
            == 200
        )
        assert member.get(ADMIN).status_code == 403
        assert member.post(ADMIN, json=component_payload()).status_code == 403
        assert (
            member.put(ADMIN + "/FUN-001", json=component_payload(archived=False)).status_code
            == 403
        )
        assert (
            member.request("DELETE", ADMIN + "/FUN-001", json={"expected_revision": 0}).status_code
            == 403
        )


def test_owner_create_edit_hide_archive_and_restore(registry):
    app, _, _ = registry
    with TestClient(app) as owner, TestClient(app) as visitor:
        login_owner(owner)
        initial = owner.get(ADMIN).json()
        assert initial["tool_options"] == [
            {"key": "avatar", "title": "原始头像", "path": "/tools/avatar"}
        ]
        created = owner.post(ADMIN, json=component_payload(title="  我的组件  ")).json()
        assert created["revision"] == 1
        item = next(item for item in created["items"] if item["id"].startswith("CUSTOM-"))
        assert item["title"] == "我的组件"
        assert "path" not in item
        updated = owner.put(
            ADMIN + "/" + item["id"],
            json=edit_payload(
                item,
                1,
                title="已修改",
                module_ids=["creative", "life"],
                kind="tool",
                tool_key="avatar",
                sort_order=0,
                hidden=True,
            ),
        ).json()
        assert updated["revision"] == 2
        item = next(row for row in updated["items"] if row["id"] == item["id"])
        assert item["path"] == "/tools/avatar" and item["hidden"] is True
        assert item["id"] not in {row["id"] for row in visitor.get(PUBLIC).json()["items"]}
        shown = owner.put(ADMIN + "/" + item["id"], json=edit_payload(item, 2, hidden=False)).json()
        assert shown["revision"] == 3
        assert visitor.get(PUBLIC).json()["items"][0]["title"] == "已修改"
        archived = owner.request(
            "DELETE", ADMIN + "/" + item["id"], json={"expected_revision": 3}
        ).json()
        assert archived["revision"] == 4
        item = next(row for row in archived["items"] if row["id"] == item["id"])
        assert item["archived"] is True
        assert item["id"] not in {row["id"] for row in visitor.get(PUBLIC).json()["items"]}
        restored = owner.put(
            ADMIN + "/" + item["id"], json=edit_payload(item, 4, archived=False)
        ).json()
        assert restored["revision"] == 5
        assert item["id"] in {row["id"] for row in visitor.get(PUBLIC).json()["items"]}
        # The catalog maps a reviewed route; it never adds providers or files.
        assert owner.get("/api/foundation/jobs").json() == {"jobs": []}
        assert owner.get("/api/files").json() == {"files": []}


def test_restart_preserves_edits_archives_and_tool_options(registry):
    app, root, seed_path = registry
    with TestClient(app) as owner:
        login_owner(owner)
        original = owner.get(ADMIN).json()["items"][0]
        owner.put(
            ADMIN + "/DAILY-001",
            json=edit_payload(original, 0, title="用户编辑不会被种子覆盖", hidden=True),
        )
        owner.request("DELETE", ADMIN + "/FUN-001", json={"expected_revision": 1})
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    seed["items"][0]["title"] = "代码种子改名"
    seed["items"][1]["archived"] = False
    seed_path.write_text(json.dumps(seed), encoding="utf-8")
    with TestClient(create_app(root)) as owner:
        login_owner(owner)
        snapshot = owner.get(ADMIN).json()
        assert snapshot["revision"] == 2
        rows = {row["id"]: row for row in snapshot["items"]}
        assert rows["DAILY-001"]["title"] == "用户编辑不会被种子覆盖"
        assert rows["DAILY-001"]["hidden"] is True
        assert rows["FUN-001"]["archived"] is True
        assert owner.get(PUBLIC).json()["items"] == []
        assert snapshot["tool_options"][0]["key"] == "avatar"


@pytest.mark.parametrize(
    "change",
    [
        {"title": "   "},
        {"title": "a" * 81},
        {"description": "x" * 501},
        {"module_ids": []},
        {"module_ids": ["missing"]},
        {"module_ids": ["life", "life"]},
        {"sort_order": -1},
        {"sort_order": 10001},
        {"sort_order": True},
        {"expected_revision": True},
        {"kind": "script"},
        {"path": "javascript:alert(1)"},
        {"kind": "tool", "tool_key": "https://outside.test"},
        {"kind": "tool", "tool_key": "missing"},
        {"tool_key": "avatar"},
    ],
)
def test_invalid_metadata_does_not_consume_revision(registry, change):
    app, _, _ = registry
    with TestClient(app) as owner:
        login_owner(owner)
        response = owner.post(ADMIN, json=component_payload(**change))
        assert response.status_code == 422, response.text
        state = owner.get(ADMIN).json()
        assert state["revision"] == 0 and len(state["items"]) == 2


def test_missing_items_and_stale_edits_do_not_modify_catalog(registry):
    app, _, _ = registry
    with TestClient(app) as owner:
        login_owner(owner)
        assert (
            owner.put(ADMIN + "/missing", json=component_payload(archived=False)).status_code == 404
        )
        assert (
            owner.request("DELETE", ADMIN + "/missing", json={"expected_revision": 0}).status_code
            == 404
        )
        assert owner.post(ADMIN, json=component_payload()).json()["revision"] == 1
        stale = owner.post(ADMIN, json=component_payload())
        assert stale.status_code == 409
        item = owner.get(ADMIN).json()["items"][0]
        assert (
            owner.put(
                ADMIN + "/" + item["id"], json=edit_payload(item, 0, title="不能覆盖")
            ).status_code
            == 409
        )
        assert (
            owner.request(
                "DELETE", ADMIN + "/" + item["id"], json={"expected_revision": 0}
            ).status_code
            == 409
        )
        assert owner.get(ADMIN).json()["revision"] == 1
        assert owner.get(PUBLIC).json()["items"][0]["title"] == "原始头像"


def test_two_owner_windows_cannot_both_commit_same_revision(registry):
    app, _, _ = registry
    with TestClient(app) as first, TestClient(app) as second:
        login_owner(first)
        login_owner(second)
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(client.post, ADMIN, json=component_payload(title=title))
                for client, title in [(first, "窗口甲"), (second, "窗口乙")]
            ]
            codes = sorted(future.result().status_code for future in futures)
        assert codes == [200, 409]
        snapshot = first.get(ADMIN).json()
        assert snapshot["revision"] == 1 and len(snapshot["items"]) == 3


def test_cross_site_writes_are_rejected(registry):
    app, _, _ = registry
    with TestClient(app) as owner:
        login_owner(owner)
        assert (
            owner.post(
                ADMIN, json=component_payload(), headers={"Origin": "https://outside.test"}
            ).status_code
            == 403
        )
        assert (
            owner.post(
                ADMIN, json=component_payload(), headers={"Sec-Fetch-Site": "cross-site"}
            ).status_code
            == 403
        )
        assert owner.get(ADMIN).json()["revision"] == 0
