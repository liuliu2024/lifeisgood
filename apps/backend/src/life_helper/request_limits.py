"""Bound actual incoming bodies before framework multipart parsing starts."""

from tempfile import SpooledTemporaryFile

from starlette.requests import Request
from starlette.responses import JSONResponse


class RequestBodyLimit:
    def __init__(self, app, max_bytes, authenticate, origins):
        self.app = app
        self.max_bytes = max_bytes
        self.authenticate = authenticate
        self.origins = origins

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] in {"GET", "HEAD", "OPTIONS"}:
            return await self.app(scope, receive, send)
        request = Request(scope)

        async def reject(status, detail):
            response = JSONResponse(
                {"detail": detail},
                status_code=status,
                headers={
                    "X-Content-Type-Options": "nosniff",
                    "Cache-Control": "no-store",
                },
            )
            await response(scope, receive, send)

        origin = request.headers.get("origin")
        if (origin is not None and origin not in self.origins) or request.headers.get(
            "sec-fetch-site"
        ) == "cross-site":
            return await reject(403, "不允许此请求来源")
        # Authenticate before reading even one upload chunk or creating a temporary file.
        if scope["method"] == "POST" and scope["path"] == "/api/files":
            if self.authenticate(request) is None:
                return await reject(401, "请先登录")
        length = request.headers.get("content-length")
        if length is not None and (not length.isdigit() or int(length) > self.max_bytes):
            return await reject(413, "上传文件超过10MB限制")

        # Own the bounded buffer and close it on success, rejection, disconnect or exception.
        # Never drain a rejected body. Only a body below the total limit reaches multipart.
        with SpooledTemporaryFile(max_size=1024 * 1024, mode="w+b") as body:
            received = 0
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                chunk = message.get("body", b"")
                received += len(chunk)
                if received > self.max_bytes:
                    return await reject(413, "上传文件超过10MB限制")
                body.write(chunk)
                if not message.get("more_body", False):
                    break
            body.seek(0)
            remaining = received
            replay_complete = False

            async def replay():
                nonlocal remaining, replay_complete
                if replay_complete:
                    return await receive()
                data = body.read(min(64 * 1024, remaining))
                remaining -= len(data)
                replay_complete = remaining == 0
                return {"type": "http.request", "body": data, "more_body": not replay_complete}

            await self.app(scope, replay, send)
