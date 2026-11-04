"""Owner-managed component metadata; executable paths stay in a reviewed source allowlist."""

import hashlib
import json
import re
import uuid
from pathlib import Path
from typing import Literal

from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

SEED_PATH = Path(__file__).with_name("component_seed.json")
MIGRATIONS_PATH = Path(__file__).with_name("component_migrations.json")


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class RegistryRevision(StrictInput):
    expected_revision: int = Field(ge=0)


class ComponentInput(RegistryRevision):
    title: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=500)
    module_ids: list[str] = Field(min_length=1, max_length=100)
    sort_order: int = Field(default=0, ge=0, le=10000)
    hidden: bool = False
    kind: Literal["tool", "candidate"]
    tool_key: str | None = Field(default=None, min_length=1, max_length=64)

    @field_validator("title")
    @classmethod
    def valid_title(cls, value):
        value = value.strip()
        if not value or any(ord(character) < 32 for character in value):
            raise ValueError("组件名称不能为空或含控制字符")
        return value

    @field_validator("module_ids")
    @classmethod
    def unique_modules(cls, value):
        if len(set(value)) != len(value):
            raise ValueError("模块不能重复")
        return value


class ComponentUpdate(ComponentInput):
    archived: bool


def attach_component_registry(app, database, owner_dependency):
    # This file is maintained alongside reviewed code, never edited by the catalog API.
    seed = json.loads(SEED_PATH.read_text(encoding="utf-8")) if SEED_PATH.is_file() else None
    modules = seed["modules"] if seed else []
    module_ids = {module["id"] for module in modules}
    paths = seed.get("ready_tool_paths", {}) if seed else {}
    paths = dict(paths)
    manifest = (
        json.loads(MIGRATIONS_PATH.read_text(encoding="utf-8"))
        if MIGRATIONS_PATH.is_file()
        else {"migrations": []}
    )
    migrations = []
    seen_migrations = set()
    for migration in manifest["migrations"]:
        migration_id = migration["id"]
        if (
            not isinstance(migration_id, str)
            or not re.fullmatch(r"[a-z0-9-]{1,100}", migration_id)
            or migration_id in seen_migrations
        ):
            raise ValueError("组件迁移编号无效或重复")
        seen_migrations.add(migration_id)
        if type(migration["enabled"]) is not bool:
            raise ValueError("组件迁移开关必须是布尔值")
        if not migration["enabled"]:
            continue
        if not migration["tools"]:
            raise ValueError("组件迁移不能没有工具")
        for tool in migration["tools"]:
            key = tool["key"]
            if key in paths:
                raise ValueError("组件迁移工具不能重复")
            paths[key] = tool["path"]
        migrations.append(migration)
    if len(module_ids) != len(modules) or not all(
        isinstance(key, str)
        and re.fullmatch(r"[a-z0-9-]{1,64}", key)
        and isinstance(path, str)
        and re.fullmatch(r"/tools/[a-z0-9-]+", path)
        for key, path in paths.items()
    ):
        raise ValueError("组件种子模块或工具路径配置无效")

    tool_titles = {}
    for item in (seed or {}).get("items", []):
        if item.get("kind") == "tool" and item.get("tool_key") in paths:
            tool_titles.setdefault(item["tool_key"], item["title"])
    for migration in migrations:
        for tool in migration["tools"]:
            tool_titles[tool["key"]] = tool["title"]
    tool_options = [
        {"key": key, "title": tool_titles.get(key, key), "path": path}
        for key, path in paths.items()
    ]

    def validate_component(payload):
        if not set(payload.module_ids) <= module_ids:
            raise HTTPException(422, "请选择有效模块")
        if payload.kind == "tool":
            if payload.tool_key not in paths:
                raise HTTPException(422, "请选择已接入的工具")
        elif payload.tool_key is not None:
            raise HTTPException(422, "候选组件不能指定可执行工具")

    with database() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS component_registry_state (
              id INTEGER PRIMARY KEY CHECK(id=1),
              revision INTEGER NOT NULL CHECK(revision>=0),
              seeded INTEGER NOT NULL CHECK(seeded IN (0,1)));
            CREATE TABLE IF NOT EXISTS component_registry_items (
              id TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS component_registry_migrations (
              id TEXT PRIMARY KEY, checksum TEXT NOT NULL, result TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS component_registry_binding_overrides (
              item_id TEXT PRIMARY KEY);
        """)
        db.execute("BEGIN IMMEDIATE")
        db.execute(
            "INSERT OR IGNORE INTO component_registry_state(id,revision,seeded) VALUES(1,0,0)"
        )
        if (
            seed
            and not db.execute("SELECT seeded FROM component_registry_state WHERE id=1").fetchone()[
                0
            ]
        ):
            seen_ids = set()
            for item in seed["items"]:
                item_id = item["id"]
                if not isinstance(item_id, str) or not re.fullmatch(
                    r"[A-Za-z0-9_-]{1,100}", item_id
                ):
                    raise ValueError("组件种子编号无效")
                if item_id in seen_ids:
                    raise ValueError("组件种子编号重复")
                seen_ids.add(item_id)
                payload = ComponentUpdate.model_validate(
                    {
                        **{key: value for key, value in item.items() if key != "id"},
                        "expected_revision": 0,
                    }
                )
                validate_component(payload)
                value = payload.model_dump(exclude={"expected_revision"})
                # Existing state is never replaced, including archived components.
                db.execute(
                    "INSERT OR IGNORE INTO component_registry_items(id,value) VALUES(?,?)",
                    (item_id, json.dumps(value, ensure_ascii=False)),
                )
            db.execute("UPDATE component_registry_state SET seeded=1 WHERE id=1")

        for migration in migrations:
            checksum = hashlib.sha256(
                json.dumps(migration, sort_keys=True, ensure_ascii=False).encode()
            ).hexdigest()
            applied = db.execute(
                "SELECT checksum FROM component_registry_migrations WHERE id=?",
                (migration["id"],),
            ).fetchone()
            if applied:
                if applied[0] != checksum:
                    raise ValueError("已执行的组件迁移不可修改，请使用新编号")
                continue
            outcomes = []
            for tool in migration["tools"]:
                item = tool["item"]
                item_id = item["id"]
                if not isinstance(item_id, str) or not re.fullmatch(
                    r"[A-Za-z0-9_-]{1,100}", item_id
                ):
                    raise ValueError("组件迁移目标编号无效")
                payload = ComponentUpdate.model_validate(
                    {
                        **{k: v for k, v in item.items() if k != "id"},
                        "expected_revision": 0,
                        "kind": "tool",
                        "tool_key": tool["key"],
                    }
                )
                validate_component(payload)
                row = db.execute(
                    "SELECT value FROM component_registry_items WHERE id=?", (item_id,)
                ).fetchone()
                protected = db.execute(
                    "SELECT 1 FROM component_registry_binding_overrides WHERE item_id=?",
                    (item_id,),
                ).fetchone()
                if row is None:
                    value = payload.model_dump(exclude={"expected_revision"})
                    db.execute(
                        "INSERT INTO component_registry_items(id,value) VALUES(?,?)",
                        (item_id, json.dumps(value, ensure_ascii=False)),
                    )
                    status = "inserted"
                else:
                    value = json.loads(row[0])
                    if protected or value["kind"] != "candidate" or value.get("tool_key"):
                        status = "skipped-owner-binding"
                    else:
                        value.update(kind="tool", tool_key=tool["key"])
                        db.execute(
                            "UPDATE component_registry_items SET value=? WHERE id=?",
                            (json.dumps(value, ensure_ascii=False), item_id),
                        )
                        status = "upgraded"
                outcomes.append({"id": item_id, "status": status})
            db.execute(
                "INSERT INTO component_registry_migrations(id,checksum,result) VALUES(?,?,?)",
                (migration["id"], checksum, json.dumps(outcomes)),
            )
            # Activation also changes the allowed tool options, even for protected rows.
            db.execute("UPDATE component_registry_state SET revision=revision+1 WHERE id=1")

    def result(db, admin=False):
        revision = db.execute(
            "SELECT revision FROM component_registry_state WHERE id=1"
        ).fetchone()[0]
        items = []
        for row in db.execute("SELECT id,value FROM component_registry_items"):
            value = json.loads(row["value"])
            if not admin and (value["hidden"] or value["archived"]):
                continue
            item = {"id": row["id"], **value}
            # No arbitrary path or executable content can be persisted by the owner API.
            if value["kind"] == "tool" and value.get("tool_key") in paths:
                item["path"] = paths[value["tool_key"]]
            if not admin:
                item.pop("hidden", None)
                item.pop("archived", None)
            items.append(item)
        items.sort(key=lambda item: (item["sort_order"], item["title"], item["id"]))
        output = {"revision": revision, "modules": modules, "items": items}
        if admin:
            output["tool_options"] = tool_options
        return output

    def check_revision(db, expected_revision):
        current = db.execute("SELECT revision FROM component_registry_state WHERE id=1").fetchone()[
            0
        ]
        if current != expected_revision:
            raise HTTPException(409, "组件目录已在其他页面修改，请重新读取后再保存")

    @app.get("/api/component-catalog")
    def public_components():
        with database() as db:
            db.execute("BEGIN")
            return result(db)

    @app.get("/api/foundation/admin/components", dependencies=[Depends(owner_dependency)])
    def owner_components():
        with database() as db:
            db.execute("BEGIN")
            return result(db, admin=True)

    @app.post("/api/foundation/admin/components", dependencies=[Depends(owner_dependency)])
    def create_component(payload: ComponentInput):
        validate_component(payload)
        value = {**payload.model_dump(exclude={"expected_revision"}), "archived": False}
        with database() as db:
            db.execute("BEGIN IMMEDIATE")
            check_revision(db, payload.expected_revision)
            db.execute(
                "INSERT INTO component_registry_items(id,value) VALUES(?,?)",
                ("CUSTOM-" + str(uuid.uuid4()), json.dumps(value, ensure_ascii=False)),
            )
            db.execute("UPDATE component_registry_state SET revision=revision+1 WHERE id=1")
            return result(db, admin=True)

    @app.put(
        "/api/foundation/admin/components/{component_id}", dependencies=[Depends(owner_dependency)]
    )
    def update_component(component_id: str, payload: ComponentUpdate):
        validate_component(payload)
        value = payload.model_dump(exclude={"expected_revision"})
        with database() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT value FROM component_registry_items WHERE id=?", (component_id,)
            ).fetchone()
            if not row:
                raise HTTPException(404, "组件不存在")
            check_revision(db, payload.expected_revision)
            previous = json.loads(row[0])
            if (previous["kind"], previous.get("tool_key")) != (
                value["kind"],
                value.get("tool_key"),
            ):
                db.execute(
                    "INSERT OR IGNORE INTO component_registry_binding_overrides(item_id) VALUES(?)",
                    (component_id,),
                )
            db.execute(
                "UPDATE component_registry_items SET value=? WHERE id=?",
                (json.dumps(value, ensure_ascii=False), component_id),
            )
            db.execute("UPDATE component_registry_state SET revision=revision+1 WHERE id=1")
            return result(db, admin=True)

    @app.delete(
        "/api/foundation/admin/components/{component_id}", dependencies=[Depends(owner_dependency)]
    )
    def archive_component(component_id: str, payload: RegistryRevision):
        with database() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT value FROM component_registry_items WHERE id=?", (component_id,)
            ).fetchone()
            if row is None:
                raise HTTPException(404, "组件不存在")
            check_revision(db, payload.expected_revision)
            value = json.loads(row[0])
            value["archived"] = True
            db.execute(
                "UPDATE component_registry_items SET value=? WHERE id=?",
                (json.dumps(value, ensure_ascii=False), component_id),
            )
            db.execute("UPDATE component_registry_state SET revision=revision+1 WHERE id=1")
            return result(db, admin=True)
