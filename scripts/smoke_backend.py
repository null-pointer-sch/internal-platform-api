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

def run_backend_smoke():
    backend_url = os.getenv("BACKEND_URL")
    if not backend_url:
        print("❌ Error: BACKEND_URL environment variable is missing.")
        sys.exit(1)

    print(f"🚀 Starting Backend Smoke Test")
    print(f"⚙️  Backend URL: {backend_url}")
    
    ctx = SmokeTestContext(backend_url)

    # 1. Health Check
    def check_health(c: SmokeTestContext):
        resp = c.client.get("/health")
        c.assert_status(resp, 200)
        data = resp.json()
        if data.get("status") != "ok":
            raise ValueError(f"Expected status 'ok' in JSON, got {data}")
    
    ctx.check("Health Endpoint", check_health)

    # 2. Protected Route (Expect 401)
    def check_protected(c: SmokeTestContext):
        resp = c.client.get("/api/v1/projects")
        c.assert_status(resp, 401)
    
    ctx.check("Protected Project List (expect 401)", check_protected)

    # 3. Registration & Identity Flow
    def check_registration_flow(c: SmokeTestContext):
        unique_id = int(time.time())
        email = f"smoke-backend-{unique_id}@example.com"
        password = "SmoketestPassword123!"
        
        # Registration
        print(f"  -> Registering {email}...")
        reg_resp = c.client.post("/api/v1/auth/register", json={"email": email, "password": password})
        # Registration returns 202 Accepted in our "Cloud Native" setup
        c.assert_status(reg_resp, 202)
        
        # Note: In our current implementation, 202 means email is queued/ready.
        # However, for smoke test purposes, if registration works, we've verified POST routing.
        # We won't attempt login if verification is required and we are in production mode.
        print(f"  -> Registration POST successful (202 Accepted)")

    ctx.check("Auth Registration Flow", check_registration_flow)

    # Summary
    print("\n" + "="*40)
    if ctx.errors:
        print(f"❌ Smoke Test FAILED with {len(ctx.errors)} errors:")
        for err in ctx.errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("✨ Backend Smoke Test PASSED successfully!")
        sys.exit(0)

if __name__ == "__main__":
    run_backend_smoke()
