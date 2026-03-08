import os
import httpx
import sys
import time
from typing import Callable, Any

# Configurable timeout
TIMEOUT = 30.0

class E2ESmokeContext:
    def __init__(self, frontend_url: str):
        self.frontend_url = frontend_url.rstrip("/")
        # We use a persistent client with cookies enabled
        self.client = httpx.Client(
            base_url=self.frontend_url, 
            timeout=TIMEOUT, 
            follow_redirects=True,
            cookies=httpx.Cookies()
        )
        self.errors = []
        self.step_count = 0
        self.headers = {}

    def update_csrf_header(self):
        """Update the X-XSRF-TOKEN header from the cookies."""
        token = self.client.cookies.get("XSRF-TOKEN")
        if token:
            self.headers["X-XSRF-TOKEN"] = token
            # print(f"  (Header X-XSRF-TOKEN set from cookie)")

    def check(self, name: str, func: Callable[['E2ESmokeContext'], Any]):
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
            body_peek = (response.text[:500] + "...") if len(response.text) > 500 else response.text
            raise ValueError(
                f"Expected status {expected_status}, got {response.status_code}.\n"
                f"Response body: {body_peek}"
            )

def run_e2e_smoke():
    frontend_url = os.getenv("FRONTEND_URL")
    if not frontend_url:
        print("❌ Error: FRONTEND_URL environment variable is missing.")
        sys.exit(1)

    print(f"🚀 Starting End-to-End Smoke Test")
    print(f"🌍 Frontend URL: {frontend_url}")
    
    ctx = E2ESmokeContext(frontend_url)

    # 1. App Shell Marker
    def check_app_marker(c: E2ESmokeContext):
        resp = c.client.get("/")
        c.assert_status(resp, 200)
        if "<app-root>" not in resp.text:
            raise ValueError("HTML response does not contain '<app-root>' marker.")
    
    ctx.check("Frontend App Shell availability", check_app_marker)

    # Global state for the flow
    unique_id = int(time.time())
    email = f"e2e-smoke-{unique_id}@example.com"
    password = "E2E-Smoketest-Pwd-12!"
    project_name = f"E2E Smoke Project {unique_id}"

    # 2. Registration
    def step_register(c: E2ESmokeContext):
        resp = c.client.post("/api/v1/auth/register", json={"email": email, "password": password})
        c.assert_status(resp, 202)
        data = resp.json()
        
        # In cloud environments, we might be in mock email mode
        # If so, we can use the verification link directly to bypass SMTP
        v_url = data.get("verification_url")
        if v_url:
            print(f"  -> Found verification link (mock mode), verifying email...")
            # If the URL is absolute but points to localhost, we normalize it to use frontend_url
            if "localhost" in v_url or "127.0.0.1" in v_url:
                path = v_url.split("/api/v1/")[1]
                v_url = f"/api/v1/{path}"
            
            v_resp = c.client.get(v_url)
            c.assert_status(v_resp, 200)
            print(f"  -> Email verified successfully via {v_url}")
    
    ctx.check("User Registration via Proxy", step_register)

    # 3. Login
    def step_login(c: E2ESmokeContext):
        # OAuth2 token flow uses form-data
        payload = {"username": email, "password": password}
        resp = c.client.post("/api/v1/auth/login", data=payload)
        
        # If this fails with 403, it means the user is unverified
        c.assert_status(resp, 200)
        c.update_csrf_header()
        print(f"  -> Session cookies and CSRF token obtained")

    ctx.check("User Login & Session Initialization", step_login)

    # 4. Authenticated /me
    def step_get_me(c: E2ESmokeContext):
        resp = c.client.get("/api/v1/auth/me", headers=c.headers)
        c.assert_status(resp, 200)
        user_data = resp.json()
        if user_data.get("email") != email:
            raise ValueError(f"Identity mismatch. Expected {email}, got {user_data.get('email')}")
    
    ctx.check("Identity Verification (/api/v1/auth/me)", step_get_me)

    # 5. Create Project
    def step_create_project(c: E2ESmokeContext):
        payload = {"name": project_name, "description": "Created by E2E Smoke Test"}
        resp = c.client.post("/api/v1/projects", json=payload, headers=c.headers)
        c.assert_status(resp, 201)
        print(f"  -> Project '{project_name}' created")

    ctx.check("Authenticated Project Creation", step_create_project)

    # 6. List Projects & Verify
    def step_verify_project(c: E2ESmokeContext):
        resp = c.client.get("/api/v1/projects", headers=c.headers)
        c.assert_status(resp, 200)
        projects = resp.json()
        if not any(p["name"] == project_name for p in projects):
            raise ValueError(f"Project '{project_name}' not found in user's project list.")
    
    ctx.check("Project Persistence Verification", step_verify_project)

    # 7. Logout & Cleanup Verify
    def step_logout(c: E2ESmokeContext):
        c.client.post("/api/v1/auth/logout", headers=c.headers)
        # Verify unauthenticated
        resp = c.client.get("/api/v1/auth/me")
        if resp.status_code != 401:
            raise ValueError(f"Expected 401 Unauthorized after logout, got {resp.status_code}")
        print("  -> Session revoked successfully")

    ctx.check("Session Revocation (Logout)", step_logout)

    # Summary
    print("\n" + "="*40)
    if ctx.errors:
        print(f"❌ E2E Smoke Test FAILED with {len(ctx.errors)} errors:")
        for err in ctx.errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("✨ End-to-End Smoke Test PASSED successfully!")
        sys.exit(0)

if __name__ == "__main__":
    run_e2e_smoke()
