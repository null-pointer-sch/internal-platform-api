from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            # If a session cookie is present, we mandate CSRF protection
            session = request.cookies.get("envctl-session")
            if session:
                xsrf_cookie = request.cookies.get("XSRF-TOKEN")
                xsrf_header = request.headers.get("X-XSRF-TOKEN")

                # If they are logged in, they must provide both the cookie and the header, and they must match.
                if not xsrf_cookie or not xsrf_header or xsrf_cookie != xsrf_header:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF token validation failed."},
                    )
        return await call_next(request)
