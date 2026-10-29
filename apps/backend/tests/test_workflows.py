import io
import zipfile

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from life_helper.main import create_app

TOKEN = "development-test-owner-token-not-production"


@pytest.fixture
def app(tmp_path):
    return create_app(tmp_path, admin_token=TOKEN)


@pytest.fixture
def client(app):
    with TestClient(app) as connection:
        connection.post("/api/session")
        yield connection


def image_bytes(size=(640, 320), mode="RGBA", color=(10, 80, 100, 0)):
    output = io.BytesIO()
    Image.new(mode, size, color).save(output, format="PNG")
    return output.getvalue()


def upload(client, **fields):
    return client.post(
        "/api/images/resize",
        files={"file": ("photo.png", image_bytes(), "image/png")},
        data={"width": 320, **fields},
    )


def test_local_image_round_trip_and_metadata(client):
    response = upload(client)
    assert response.status_code == 200, response.text
    job = response.json()
    assert job["details"]["width"] == 320
    assert job["details"]["height"] == 160
    result = client.get(job["download_url"])
    assert result.status_code == 200
    image = Image.open(io.BytesIO(result.content))
    assert image.size == (320, 160)
    assert image.getpixel((0, 0)) == (255, 255, 255)
    assert image.getexif() == {}
    assert client.get("/api/jobs").json()["jobs"][0]["id"] == job["id"]


@pytest.mark.parametrize("output_format", ["png", "webp"])
def test_transparency_and_no_upscaling(client, output_format):
    response = upload(client, output_format=output_format, width=1200)
    job = response.json()
    assert job["details"]["width"] == 640
    image = Image.open(io.BytesIO(client.get(job["download_url"]).content))
    assert image.convert("RGBA").getpixel((0, 0))[3] == 0


def test_workspace_isolation_and_missing_session(app, client):
    job = upload(client).json()
    with TestClient(app) as second:
        assert second.get(job["download_url"]).status_code == 401
        second.post("/api/session")
        assert second.get(job["download_url"]).status_code == 404
        assert second.get("/api/jobs").json()["jobs"] == []


@pytest.mark.parametrize("width", [0, 5000, "oops"])
def test_invalid_width(client, width):
    assert upload(client, width=width).status_code == 422


def test_corrupt_image_does_not_create_job(client):
    response = client.post("/api/images/resize", files={"file": ("fake.png", b"not an image")})
    assert response.status_code == 422
    assert client.get("/api/jobs").json()["jobs"] == []


def test_oversize_file(client):
    response = client.post(
        "/api/images/resize", files={"file": ("huge.png", b"x" * (10 * 1024 * 1024 + 1))}
    )
    assert response.status_code == 413


def test_document_mock_edit_export_and_isolation(client, app):
    response = client.post(
        "/api/documents/preview", json={"company": "测试店铺", "product": "维修服务"}
    )
    assert response.status_code == 200
    job = response.json()
    assert job["details"]["mode"] == "mock"
    assert "未调用AI" in job["details"]["text"]
    edited = "测试店铺的真实服务介绍"
    assert client.post(f"/api/jobs/{job['id']}/document", json={"text": edited}).status_code == 200
    document = client.get(job["download_url"]).content
    with zipfile.ZipFile(io.BytesIO(document)) as archive:
        body = archive.read("word/document.xml").decode()
        assert edited in body
        assert "未调用AI" in body
    with TestClient(app) as second:
        second.post("/api/session")
        assert (
            second.post(f"/api/jobs/{job['id']}/document", json={"text": "修改"}).status_code == 404
        )


def test_owner_only_routing_and_no_secret_leak(client, monkeypatch):
    monkeypatch.setenv("TEST_PROVIDER_KEY", "sensitive-key-must-not-leak")
    assert client.get("/api/admin/bindings").status_code == 403
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = client.put(
        "/api/admin/bindings",
        headers=headers,
        json={
            "component": "documents.generate",
            "mode": "api_draft",
            "provider": "owner-selected",
            "model": "owner-selected",
            "base_url": "https://example.com/v1",
            "secret_env": "TEST_PROVIDER_KEY",
        },
    )
    assert response.status_code == 200
    assert response.json()["billable_calls_enabled"] is False
    assert (
        "sensitive-key-must-not-leak" not in client.get("/api/admin/bindings", headers=headers).text
    )
    assert (
        client.post(
            "/api/documents/preview", json={"company": "店铺", "product": "商品"}
        ).status_code
        == 409
    )


@pytest.mark.parametrize(
    "fields",
    [
        {"base_url": "https://user:password@example.com/v1"},
        {"base_url": "http://example.com"},
        {"secret_env": "sk-real-secret"},
        {"base_url": "https://example.com?key=secret"},
    ],
)
def test_bad_provider_configuration(client, fields):
    response = client.put(
        "/api/admin/bindings",
        headers={"Authorization": f"Bearer {TOKEN}"},
        json={
            "component": "documents.generate",
            "mode": "api_draft",
            **fields,
        },
    )
    assert response.status_code == 422


def test_cross_origin_write_rejected(client):
    assert (
        client.post("/api/session", headers={"Origin": "https://untrusted.example"}).status_code
        == 403
    )


def test_session_reuse_and_persistence(client, app, tmp_path):
    first = client.post("/api/session").json()["workspace_id"]
    assert client.post("/api/session").json()["workspace_id"] == first
    upload(client)
    assert len(client.get("/api/jobs").json()["jobs"]) == 1
    assert app.state.engine.url.database.endswith("preview.sqlite3")
    with TestClient(create_app(tmp_path, admin_token=TOKEN)) as restarted:
        restarted.cookies.update(client.cookies)
        recovered = restarted.get("/api/jobs")
        assert recovered.status_code == 200
        assert len(recovered.json()["jobs"]) == 1


def test_admin_disabled_without_strong_token(tmp_path):
    with TestClient(create_app(tmp_path, admin_token="")) as client:
        assert client.get("/api/admin/bindings").status_code == 503
