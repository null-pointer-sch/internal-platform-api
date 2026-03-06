def test_cors_allowed_origin(client):
    """CORS headers should be present for the allowed frontend origin."""
    response = client.options(
        "/api/v1/projects/",
        headers={
            "Origin": "http://localhost:4200",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:4200"


def test_cors_disallowed_origin(client):
    """CORS headers should not include a disallowed origin."""
    response = client.options(
        "/api/v1/projects/",
        headers={
            "Origin": "http://evil.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") != "http://evil.com"
