"""Endpoint tests for `POST /operations/from-text`.

Account ownership is validated before the provider is contacted, and text
validation happens in the schema, so the failure cases run without an API key.
The single happy-path test mocks `TextOperationService.call_provider` (still no
real provider call) and exercises the extract → confirm flow end to end.

Fixtures (`client`, `account`, `auth_headers`) come from `tests/conftest.py`."""

import json

import pytest

from src.services.operation_text_service import TextOperationService


def test_from_text_extracts_and_confirms_full_flow(client, account, monkeypatch):
    """Happy path with the provider mocked: the narration is structured to a preview
    payload (not persisted) and confirming it through `POST /operations/new` creates
    the operation and debits the account."""
    categories = client.get("/categories/", headers=account["headers"]).json()
    expense_category = next(c for c in categories if c["type"] == "Expense")

    def _fake_call_provider(api_url, api_key, model, prompt):
        assert "Carrefour" in prompt
        return json.dumps(
            {
                "concept": "Compra en Carrefour",
                "amount": 100,
                "currency": "USD",
                "type": "expense",
                "name": "Carrefour",
                "category": expense_category["name"],
            }
        )

    monkeypatch.setattr(TextOperationService, "call_provider", staticmethod(_fake_call_provider))

    extraction_response = client.post(
        "/operations/from-text",
        json={"text": "gaste 100 pesos en Carrefour", "account_id": account["id"]},
        headers=account["headers"],
    )
    assert extraction_response.status_code == 200
    extraction = extraction_response.json()
    assert extraction == {
        "concept": "Compra en Carrefour",
        "amount": 100.0,
        "type": "expense",
        "category_id": expense_category["id"],
        "name": "Carrefour",
        "currency": "USD",
    }
    assert client.get("/accounts/", headers=account["headers"]).json()[0]["balance"] == 400.0

    confirmation = client.post(
        "/operations/new",
        json={**extraction, "account_id": account["id"]},
        headers=account["headers"],
    )
    assert confirmation.status_code == 201
    operation = confirmation.json()
    assert operation["type"] == "Expense"
    assert operation["amount"] == 100.0
    assert operation["name"] == "Carrefour"
    accounts = client.get("/accounts/", headers=account["headers"]).json()
    assert accounts[0]["balance"] == 300.0


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