import os
import httpx
import sys
import time
from typing import Callable, Any

# Configurable timeout
TIMEOUT = 15.0

class SmokeTestContext:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(base_url=self.base_url, timeout=TIMEOUT, follow_redirects=True)
        self.errors = []
        self.step_count = 0

    def check(self, name: str, func: Callable[['SmokeTestContext'], Any]):
        self.step_count += 1
        print(f"[{self.step_count}] Testing {name}...")
        start_time = time.time()
        try:
            func(self)
            duration = time.time() - start_time
            print(f"  ✅ PASSED ({duration:.2f}s)")
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Step '{name}' failed: {str(e)}"
            self.errors.append(error_msg)
            print(f"  ❌ FAILED ({duration:.2f}s)")

    def assert_status(self, response: httpx.Response, expected_status: int):
        if response.status_code != expected_status:
            body_peek = (response.text[:200] + "...") if len(response.text) > 200 else response.text
            raise ValueError(
                f"Expected status {expected_status}, got {response.status_code}.\n"
                f"Response body: {body_peek}"
            )

def run_frontend_smoke():
    frontend_url = os.getenv("FRONTEND_URL")
    if not frontend_url:
        print("❌ Error: FRONTEND_URL environment variable is missing.")
        sys.exit(1)

    print(f"🚀 Starting Frontend Smoke Test")
    print(f"🌍 Frontend URL: {frontend_url}")
    
    ctx = SmokeTestContext(frontend_url)

    # 1. UI Accessibility & Angular Marker
    def check_ui(c: SmokeTestContext):
        resp = c.client.get("/")
        c.assert_status(resp, 200)
        if "<app-root>" not in resp.text:
            raise ValueError("HTML response does not contain '<app-root>' marker.")
    
    ctx.check("Frontend Root (Angular App Root)", check_ui)

    # 2. Proxy Check (Expect 401 via Frontend)
    def check_proxy_auth(c: SmokeTestContext):
        resp = c.client.get("/api/v1/projects")
        # If proxy is working, backend returns 401
        # If proxy is broken, Nginx might return 404/502/405
        c.assert_status(resp, 401)
    
    ctx.check("API Proxying - Protected Route (expect 401 via Frontend)", check_proxy_auth)

    # 3. Proxied Registration POST
    def check_proxied_registration(c: SmokeTestContext):
        unique_id = int(time.time())
        email = f"smoke-frontend-{unique_id}@example.com"
        password = "SmoketestPassword123!"
        
        print(f"  -> Sending registration for {email} via proxy...")
        reg_resp = c.client.post("/api/v1/auth/register", json={"email": email, "password": password})
        
        # Verify Nginx/Cloud Run doesn't block the POST and Backend accepts it
        c.assert_status(reg_resp, 202)
        print(f"  -> Proxied Registration POST successful (202 Accepted)")

    ctx.check("API Proxying - Auth Registration Flow", check_proxied_registration)

    # Summary
    print("\n" + "="*40)
    if ctx.errors:
        print(f"❌ Smoke Test FAILED with {len(ctx.errors)} errors:")
        for err in ctx.errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("✨ Frontend Smoke Test PASSED successfully!")
        sys.exit(0)

if __name__ == "__main__":
    run_frontend_smoke()
