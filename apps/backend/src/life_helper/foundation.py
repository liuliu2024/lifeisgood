"""Private local accounts and assets. No providers, payments or candidate execution."""

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from fastapi import Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field

COOKIE = "life_account"
MAX_FILE = 10 * 1024 * 1024
SESSION_SECONDS = 7 * 24 * 3600
PBKDF_ROUNDS = 600_000


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(max_length=254)
    password: str = Field(min_length=12, max_length=128)


class Registration(Credentials):
    display_name: str = Field(default="", max_length=80)


class Favorite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    selected: bool


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    site_name: str = Field(default="生活小助手", min_length=1, max_length=80)
    support_email: str = Field(default="", max_length=254)
    announcement: str = Field(default="", max_length=2000)


class SettingsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    settings: Settings


def email_key(value):
    value = value.strip().lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
        raise HTTPException(422, "请填写有效邮箱")
    return value


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF_ROUNDS)
    return f"pbkdf2_sha256${PBKDF_ROUNDS}${salt}${digest.hex()}"


def password_matches(password, stored):
    algorithm, rounds, salt, expected = stored.split("$")
    if algorithm != "pbkdf2_sha256":
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds))
    return hmac.compare_digest(actual.hex(), expected)


def attach_foundation(app, root: Path):
    database_path = root / "foundation.sqlite3"
    assets = root / "private_files"
    assets.mkdir(exist_ok=True)

    @app.exception_handler(RequestValidationError)
    async def safe_validation_error(request: Request, error: RequestValidationError):
        # Validation errors must never reflect submitted passwords or other private values.
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {"loc": item["loc"], "msg": item["msg"], "type": item["type"]}
                    for item in error.errors()
                ]
            },
        )

    @contextmanager
    def database():
        db = sqlite3.connect(database_path, timeout=15)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    with database() as db:
        db.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS accounts (
              id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
              display_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('member','owner')),
              workspace_id TEXT UNIQUE NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions (
              token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id),
              expires_at REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS favorites (
              workspace_id TEXT NOT NULL, capability_id TEXT NOT NULL,
              PRIMARY KEY(workspace_id, capability_id));
            CREATE TABLE IF NOT EXISTS files (
              id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, name TEXT NOT NULL,
              size INTEGER NOT NULL, created_at TEXT NOT NULL, mime_type TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS auth_attempts (
              bucket TEXT NOT NULL, created_at REAL NOT NULL);
            CREATE INDEX IF NOT EXISTS auth_attempts_bucket ON auth_attempts(bucket, created_at);
        """)
        owner_email = os.getenv("LIFE_OWNER_EMAIL", "")
        owner_password = os.getenv("LIFE_OWNER_PASSWORD", "")
        if owner_email or owner_password:
            if not owner_email or not 12 <= len(owner_password) <= 128:
                raise ValueError("站长初始化需要有效邮箱和12–128位密码")
            owner_email = email_key(owner_email)
            existing = db.execute(
                "SELECT role FROM accounts WHERE email=?", (owner_email,)
            ).fetchone()
            if existing and existing["role"] != "owner":
                raise ValueError("此邮箱已有普通账户，不能通过启动配置自动提权")
            if not existing:
                db.execute(
                    "INSERT INTO accounts VALUES(?,?,?,?,?,?)",
                    (
                        str(uuid.uuid4()),
                        owner_email,
                        password_hash(owner_password),
                        "站长",
                        "owner",
                        str(uuid.uuid4()),
                    ),
                )

    # Equal-cost password check for unknown accounts; never includes a real credential.
    dummy_hash = password_hash(secrets.token_urlsafe(32))

    def throttle(request, email):
        ip = request.client.host if request.client else "unknown"
        timestamp = time.time()
        buckets = [("ip:" + ip, 40), ("email:" + email, 12)]
        with database() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM auth_attempts WHERE created_at<?", (timestamp - 900,))
            for bucket, limit in buckets:
                count = db.execute(
                    "SELECT count(*) FROM auth_attempts WHERE bucket=?", (bucket,)
                ).fetchone()[0]
                if count >= limit:
                    raise HTTPException(
                        429, "尝试过于频繁，请稍后再试", headers={"Retry-After": "900"}
                    )
            db.executemany(
                "INSERT INTO auth_attempts VALUES(?,?)",
                [(bucket, timestamp) for bucket, _ in buckets],
            )

    def current(request: Request):
        token = request.cookies.get(COOKIE, "")
        if not token or len(token) > 200:
            return None
        with database() as db:
            return db.execute(
                """SELECT a.* FROM accounts a JOIN sessions s ON a.id=s.user_id
                WHERE s.token_hash=? AND s.expires_at>?""",
                (hashlib.sha256(token.encode()).hexdigest(), time.time()),
            ).fetchone()

    app.state.foundation_authenticate = current

    def required(request: Request):
        user = current(request)
        if user is None:
            raise HTTPException(401, "请先登录")
        return user

    User = Annotated[sqlite3.Row, Depends(required)]

    def owner(user: User):
        if user["role"] != "owner":
            raise HTTPException(403, "仅站长可以查看或编辑配置")
        return user

    def account(user):
        return {
            "authenticated": user is not None,
            "user": None
            if user is None
            else {key: user[key] for key in ("id", "email", "display_name", "role")},
            "workspace_id": user["workspace_id"] if user else None,
        }

    def establish(request, response, user):
        token = secrets.token_urlsafe(32)
        old = request.cookies.get(COOKIE, "")
        with database() as db:
            db.execute(
                "DELETE FROM sessions WHERE token_hash=? OR expires_at<?",
                (hashlib.sha256(old.encode()).hexdigest(), time.time()),
            )
            db.execute(
                "INSERT INTO sessions VALUES(?,?,?)",
                (
                    hashlib.sha256(token.encode()).hexdigest(),
                    user["id"],
                    time.time() + SESSION_SECONDS,
                ),
            )
        response.set_cookie(
            COOKIE,
            token,
            httponly=True,
            samesite="lax",
            max_age=SESSION_SECONDS,
            secure=os.getenv("LIFE_COOKIE_SECURE", "false").lower() == "true",
        )
        return account(user)

    @app.get("/api/account")
    def get_account(request: Request):
        return account(current(request))

    @app.post("/api/auth/register")
    def register(payload: Registration, request: Request, response: Response):
        email = email_key(payload.email)
        throttle(request, email)
        with database() as db:
            try:
                db.execute(
                    "INSERT INTO accounts VALUES(?,?,?,?,?,?)",
                    (
                        str(uuid.uuid4()),
                        email,
                        password_hash(payload.password),
                        payload.display_name.strip() or email.split("@")[0],
                        "member",
                        str(uuid.uuid4()),
                    ),
                )
            except sqlite3.IntegrityError as error:
                raise HTTPException(409, "该邮箱无法注册，请登录或换一个邮箱") from error
            user = db.execute("SELECT * FROM accounts WHERE email=?", (email,)).fetchone()
        return establish(request, response, user)

    @app.post("/api/auth/login")
    def login(payload: Credentials, request: Request, response: Response):
        email = email_key(payload.email)
        throttle(request, email)
        with database() as db:
            user = db.execute("SELECT * FROM accounts WHERE email=?", (email,)).fetchone()
        valid = password_matches(payload.password, user["password_hash"] if user else dummy_hash)
        if user is None or not valid:
            raise HTTPException(401, "邮箱或密码不正确")
        return establish(request, response, user)

    @app.post("/api/auth/logout")
    def logout(request: Request, response: Response):
        token = request.cookies.get(COOKIE, "")
        with database() as db:
            db.execute(
                "DELETE FROM sessions WHERE token_hash=?",
                (hashlib.sha256(token.encode()).hexdigest(),),
            )
        response.delete_cookie(COOKIE, httponly=True, samesite="lax")
        return account(None)

    @app.get("/api/favorites")
    def favorites(user: User):
        with database() as db:
            rows = db.execute(
                "SELECT capability_id FROM favorites WHERE workspace_id=? ORDER BY capability_id",
                (user["workspace_id"],),
            )
            return {"capability_ids": [row[0] for row in rows]}

    @app.put("/api/favorites/{capability_id}")
    def set_favorite(capability_id: str, payload: Favorite, user: User):
        if not re.fullmatch(r"FUN-\d{3}", capability_id) or not 1 <= int(capability_id[4:]) <= 89:
            raise HTTPException(422, "候选功能编号无效")
        with database() as db:
            if payload.selected:
                db.execute(
                    "INSERT OR IGNORE INTO favorites VALUES(?,?)",
                    (
                        user["workspace_id"],
                        capability_id,
                    ),
                )
            else:
                db.execute(
                    "DELETE FROM favorites WHERE workspace_id=? AND capability_id=?",
                    (
                        user["workspace_id"],
                        capability_id,
                    ),
                )
        return favorites(user)

    def serialize_file(row):
        return {**dict(row), "download_url": f"/api/files/{row['id']}/download"} if row else None

    def file_for(file_id, user):
        with database() as db:
            row = db.execute(
                "SELECT id,name,size,created_at,mime_type FROM files WHERE id=? AND workspace_id=?",
                (file_id, user["workspace_id"]),
            ).fetchone()
        if row is None:
            raise HTTPException(404, "文件不存在")
        return row

    @app.get("/api/files")
    def list_files(user: User):
        with database() as db:
            rows = db.execute(
                "SELECT id,name,size,created_at,mime_type FROM files "
                "WHERE workspace_id=? ORDER BY created_at DESC",
                (user["workspace_id"],),
            )
            return {"files": [serialize_file(row) for row in rows]}

    @app.post("/api/files")
    def upload_file(user: User, file: Annotated[UploadFile, File()]):
        name = (file.filename or "未命名文件").replace("\\", "/").split("/")[-1]
        name = "".join(char for char in name if ord(char) >= 32 and ord(char) != 127)[:160]
        if not name or name in {".", ".."}:
            raise HTTPException(422, "文件名无效")
        file_id = str(uuid.uuid4())
        directory = assets / user["workspace_id"]
        directory.mkdir(exist_ok=True)
        target = directory / file_id
        size = 0
        try:
            with target.open("xb") as output:
                while chunk := file.file.read(64 * 1024):
                    size += len(chunk)
                    if size > MAX_FILE:
                        raise HTTPException(413, "文件超过10MB限制")
                    output.write(chunk)
            # Serve all untrusted formats only as opaque attachment, never inline HTML/SVG.
            with database() as db:
                db.execute(
                    "INSERT INTO files VALUES(?,?,?,?,?,?)",
                    (
                        file_id,
                        user["workspace_id"],
                        name,
                        size,
                        datetime.now(UTC).isoformat(),
                        "application/octet-stream",
                    ),
                )
        except Exception:
            target.unlink(missing_ok=True)
            raise
        return {"file": serialize_file(file_for(file_id, user))}

    @app.get("/api/files/{file_id}/download")
    def download_file(file_id: str, user: User):
        row = file_for(file_id, user)
        path = assets / user["workspace_id"] / row["id"]
        if not path.is_file():
            raise HTTPException(404, "文件不存在")
        return FileResponse(
            path,
            filename=row["name"],
            media_type="application/octet-stream",
            content_disposition_type="attachment",
        )

    @app.delete("/api/files/{file_id}")
    def delete_file(file_id: str, user: User):
        row = file_for(file_id, user)
        with database() as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                (assets / user["workspace_id"] / row["id"]).unlink(missing_ok=True)
            except OSError as error:
                # Roll back, retaining owned metadata so Windows locks can be retried.
                raise HTTPException(
                    409, "文件暂时无法删除，请关闭占用该文件的程序后重试"
                ) from error
            db.execute(
                "DELETE FROM files WHERE id=? AND workspace_id=?",
                (
                    row["id"],
                    user["workspace_id"],
                ),
            )
        return {"deleted": True}

    @app.get("/api/foundation/jobs")
    def jobs(user: User):
        return {"jobs": []}

    def settings_result():
        with database() as db:
            row = db.execute("SELECT value FROM settings WHERE id=1").fetchone()
        return {
            "settings": json.loads(row[0]) if row else Settings().model_dump(),
            "billable_calls_enabled": False,
            "tools_enabled": False,
            "mode": "draft",
        }

    @app.get("/api/foundation/admin/settings", dependencies=[Depends(owner)])
    def get_settings():
        return settings_result()

    @app.put("/api/foundation/admin/settings", dependencies=[Depends(owner)])
    def put_settings(payload: SettingsInput):
        if payload.settings.support_email:
            email_key(payload.settings.support_email)
        with database() as db:
            db.execute(
                "INSERT INTO settings VALUES(1,?) "
                "ON CONFLICT(id) DO UPDATE SET value=excluded.value",
                (json.dumps(payload.settings.model_dump(), ensure_ascii=False),),
            )
        return settings_result()
