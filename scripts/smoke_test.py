import os
import httpx
import sys
import time

def run_smoke_test():
    frontend_url = os.getenv("FRONTEND_URL")
    backend_url = os.getenv("BACKEND_URL")

    if not frontend_url or not backend_url:
        print("Error: FRONTEND_URL and BACKEND_URL must be set.")
        sys.exit(1)

    print(f"🚀 Starting Smoke Test...")
    print(f"🌍 Frontend: {frontend_url}")
    print(f"⚙️  Backend:  {backend_url}")

    errors = []

    # 1. Check Frontend Accessibility
    try:
        print(f"\n[1/3] Testing Frontend accessibility...")
        response = httpx.get(frontend_url, timeout=10.0)
        if response.status_code == 200:
            print("✅ Frontend is up!")
        else:
            errors.append(f"Frontend returned status {response.status_code}")
    except Exception as e:
        errors.append(f"Frontend connection failed: {e}")

    # 2. Check Backend Health
    try:
        print(f"\n[2/3] Testing Backend health endpoint...")
        response = httpx.get(f"{backend_url}/health", timeout=10.0)
        if response.status_code == 200 and response.json().get("status") == "ok":
            print("✅ Backend health check passed!")
        else:
            errors.append(f"Backend health check failed: {response.status_code} - {response.text}")
    except Exception as e:
        errors.append(f"Backend health connection failed: {e}")

    # 3. Check API Core (Projects endpoint)
    try:
        print(f"\n[3/3] Testing API core (Projects list)...")
        # We expect 401 Unauthorized since we're not logged in, 
        # but 401 proves the app is running and auth is working.
        # If it were 500 or connection refused, that's a failure.
        response = httpx.get(f"{backend_url}/api/v1/projects", timeout=10.0)
        if response.status_code == 401:
            print("✅ API core is reachable (received expected 401 Unauthorized)!")
        elif response.status_code == 200:
             print("✅ API core is reachable (received 200 OK)!")
        else:
            errors.append(f"API core test failed: Received {response.status_code} instead of 401/200")
    except Exception as e:
        errors.append(f"API core connection failed: {e}")

    if errors:
        print("\n❌ Smoke Test FAILED with the following errors:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("\n✨ Smoke Test PASSED successfully!")
        sys.exit(0)

if __name__ == "__main__":
    run_smoke_test()
