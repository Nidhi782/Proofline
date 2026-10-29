"""Small PEP middleware: health/docs stay public; protected resources can be gated later."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class PEPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # The demo API exposes only explicit PDP endpoints; never claim generic routes
        # are protected by a proof until an application supplies a policy mapping.
        if request.url.path.startswith("/protected/"):
            return JSONResponse({"detail": "No protected resource policy is configured"}, status_code=403)
        return await call_next(request)
