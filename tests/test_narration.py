"""Endpoint tests for `POST /operations/from-text` that fail before the AI call.

Account ownership is validated before the provider is contacted, and text
validation happens in the schema, so all these cases run without an API key.

Fixtures (`client`, `account`, `auth_headers`) come from `tests/conftest.py`."""

import pytest


@pytest.mark.parametrize("invalid_text", ["   ", "a" * 501])
def test_from_text_with_invalid_text_returns_422(client, account, invalid_text):
    """Blank and oversize narrations are rejected by the schema before any logic."""
    response = client.post(
        "/operations/from-text",
        json={"text": invalid_text, "account_id": account["id"]},
        headers=account["headers"],
    )

    assert response.status_code == 422


def test_from_text_without_token_returns_401(client):
    response = client.post(
        "/operations/from-text",
        json={"text": "gaste 9800 pesos en Carrefour", "account_id": 1},
    )

    assert response.status_code == 401


def test_from_text_with_unknown_account_returns_404(client, account):
    """Account ownership is validated before the provider, so this never hits the AI."""
    response = client.post(
        "/operations/from-text",
        json={"text": "gaste 9800 pesos en Carrefour", "account_id": 999999},
        headers=account["headers"],
    )

    assert response.status_code == 404


def test_from_text_on_foreign_account_returns_403(client, account, auth_headers):
    other_headers = auth_headers(name="intruder", email="intruder@example.com")

    response = client.post(
        "/operations/from-text",
        json={"text": "gaste 9800 pesos en Carrefour", "account_id": account["id"]},
        headers=other_headers,
    )

    assert response.status_code == 403
    assert "does not belong" in response.json()["detail"]