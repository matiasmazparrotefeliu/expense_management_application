import pytest


def test_create_account_valid_payload_returns_201(client, auth_headers, account_payload):
    headers = auth_headers()
    response = client.post(
        "/accounts/new",
        json=account_payload(balance=1250.5, bank="Banco Nación"),
        headers=headers,
    )

    assert response.status_code == 201
    account = response.json()
    assert account["name"] == "Home"
    assert account["currency"] == "USD"
    assert account["balance"] == 1250.5
    assert account["bank"] == "Banco Nación"
    assert account["is_active"] is True
    assert account["id"] > 0


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param({"currency": "EUR"}, id="unsupported-currency"),
        pytest.param({"balance": 0}, id="zero-balance"),
        pytest.param({"balance": -1}, id="negative-balance"),
        pytest.param({"bank": None}, id="null-bank"),
        pytest.param({"bank": ""}, id="empty-bank"),
        pytest.param({"bank": "   "}, id="blank-bank"),
    ],
)
def test_create_account_rejects_invalid_payload(client, auth_headers, account_payload, overrides):
    headers = auth_headers()
    response = client.post("/accounts/new", json=account_payload(**overrides), headers=headers)

    assert response.status_code == 422


def test_create_account_requires_auth(client, account_payload):
    response = client.post("/accounts/new", json=account_payload())

    assert response.status_code == 401


def test_create_duplicate_account_name_returns_400(client, auth_headers, account_payload):
    headers = auth_headers()
    first = client.post("/accounts/new", json=account_payload(), headers=headers)
    assert first.status_code == 201

    second = client.post("/accounts/new", json=account_payload(currency="ARS"), headers=headers)

    assert second.status_code == 400
    assert "already exists" in second.json()["detail"]


def test_accounts_are_isolated_between_users(client, auth_headers, account_payload):
    user_one = auth_headers()
    user_two = auth_headers(name="another_user", email="another@example.com")

    client.post("/accounts/new", json=account_payload(), headers=user_one)

    user_two_accounts = client.get("/accounts/", headers=user_two).json()
    user_one_accounts = client.get("/accounts/", headers=user_one).json()

    assert user_two_accounts == []
    assert len(user_one_accounts) == 1


def test_get_accounts_returns_only_active(client, auth_headers, account_payload):
    headers = auth_headers()
    client.post("/accounts/new", json=account_payload(), headers=headers)

    accounts = client.get("/accounts/", headers=headers).json()

    assert len(accounts) == 1
    assert accounts[0]["name"] == "Home"
    assert accounts[0]["balance"] == 400.0
    assert accounts[0]["bank"] == "Test Bank"