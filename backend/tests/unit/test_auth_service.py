from datetime import datetime, timezone
import pytest
from app.core.security import create_access_token, hash_password, verify_password

def test_password_hashing():
    password = "secretpassword"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_create_access_token():
    subject = "user@example.com"
    token = create_access_token(subject)
    assert isinstance(token, str)
    assert len(token) > 0

def test_create_access_token_with_expiry():
    subject = "user@example.com"
    token = create_access_token(subject, expires_minutes=15)
    assert isinstance(token, str)
