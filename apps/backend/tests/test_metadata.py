import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from PIL.PngImagePlugin import PngInfo

from life_helper.main import create_app


@pytest.mark.parametrize("output_format", ["jpeg", "png", "webp"])
def test_sensitive_metadata_removed(tmp_path, output_format):
    image = Image.new("RGB", (100, 100), "blue")
    metadata = PngInfo()
    metadata.add_text("Comment", "private-location-marker")
    exif = Image.Exif()
    exif[270] = "private-location-marker"
    raw = io.BytesIO()
    image.save(raw, format="PNG", pnginfo=metadata, exif=exif)
    with TestClient(create_app(tmp_path)) as client:
        client.post("/api/session")
        response = client.post(
            "/api/images/resize",
            files={"file": ("private.png", raw.getvalue(), "image/png")},
            data={"output_format": output_format},
        )
        assert response.status_code == 200
        output = client.get(response.json()["download_url"])
        assert b"private-location-marker" not in output.content
        decoded = Image.open(io.BytesIO(output.content))
        assert not decoded.getexif()
