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


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"email": "a@b.com", "password": "secret"}, id="missing-name"),
        pytest.param({"name": "noemail", "password": "secret"}, id="missing-email"),
        pytest.param({"name": "nopass", "email": "a@b.com"}, id="missing-password"),
    ],
)
def test_register_missing_fields_returns_422(client, payload):
    response = client.post("/users/new", json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"name": "", "email": "a@b.com", "password": "secret"}, id="empty-name"),
        pytest.param({"name": "noemail", "email": "", "password": "secret"}, id="empty-email"),
        pytest.param({"name": "nopass", "email": "a@b.com", "password": ""}, id="empty-password"),
    ],
)
def test_register_empty_fields_returns_400(client, payload):
    response = client.post("/users/new", json=payload)

    assert response.status_code == 400


def test_register_duplicate_user_returns_409(client):
    first = client.post("/users/new", json=USER_PAYLOAD)
    assert first.status_code == 201

    second = client.post("/users/new", json=USER_PAYLOAD)
    assert second.status_code == 409
    assert second.json()["detail"] == "A user with that name or email already exists"

    duplicate_email = client.post(
        "/users/new",
        json={"name": "otro_nombre", "email": USER_PAYLOAD["email"], "password": "secret"},
    )
    assert duplicate_email.status_code == 409


def test_login_success_returns_token(client, registered_user):
    response = client.post(
        "/users/login",
        json={"email": USER_PAYLOAD["email"], "password": USER_PAYLOAD["password"]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]

    user = data["user"]
    assert user["id"] == registered_user["id"]
    assert user["name"] == USER_PAYLOAD["name"]
    assert user["email"] == USER_PAYLOAD["email"]
    assert user["accounts"] == []
    assert "password" not in user

    claims = jwt.decode(data["access_token"], SECRET_KEY, algorithms=[ALGORITHM], leeway=1)
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