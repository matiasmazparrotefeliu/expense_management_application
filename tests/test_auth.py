import jwt
import pytest

from src.auth.security import ALGORITHM, SECRET_KEY

USER_PAYLOAD = {
    "name": "matute92",
    "email": "matumazparrote@gmail.com",
    "password": "francia",
}


@pytest.fixture
def registered_user(client):
    response = client.post("/users/new", json=USER_PAYLOAD)
    assert response.status_code == 201
    return response.json()


def test_register_creates_user(client):
    response = client.post("/users/new", json=USER_PAYLOAD)

    assert response.status_code == 201
    user = response.json()
    assert user["name"] == USER_PAYLOAD["name"]
    assert user["email"] == USER_PAYLOAD["email"]
    assert user["accounts"] == []
    assert user["id"] > 0
    assert "password" not in user


def test_register_missing_fields_returns_422(client):
    invalid_payloads = [
        {"email": "a@b.com", "password": "secret"},
        {"name": "noemail", "password": "secret"},
        {"name": "nopass", "email": "a@b.com"},
    ]
    for payload in invalid_payloads:
        response = client.post("/users/new", json=payload)
        assert response.status_code == 422, payload


def test_register_empty_fields_returns_400(client):
    invalid_payloads = [
        {"name": "", "email": "a@b.com", "password": "secret"},
        {"name": "noemail", "email": "", "password": "secret"},
        {"name": "nopass", "email": "a@b.com", "password": ""},
    ]
    for payload in invalid_payloads:
        response = client.post("/users/new", json=payload)
        assert response.status_code == 400, payload


def test_login_success_returns_token(client, registered_user):
    response = client.post(
        "/users/login",
        json={"email": USER_PAYLOAD["email"], "password": USER_PAYLOAD["password"]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]

    claims = jwt.decode(data["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert set(claims.keys()) == {"sub", "exp", "iat"}
    assert claims["sub"] == str(registered_user["id"])
    assert "password" not in claims


def test_login_wrong_password_returns_400(client, registered_user):
    response = client.post(
        "/users/login",
        json={"email": USER_PAYLOAD["email"], "password": "wrong-password"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid credentials"


def test_login_user_not_found_returns_404(client):
    response = client.post(
        "/users/login",
        json={"email": "unknown@example.com", "password": "whatever"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"