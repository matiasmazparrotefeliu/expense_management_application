import pytest


def test_create_income_operation(client, account):
    """A funded income operation credits the account and exposes the canonical type value."""
    response = client.post(
        "/operations/new",
        json={
            "concept": "Salary",
            "amount": 500,
            "type": "ingreso",
            "account_id": account["id"],
            "category_id": account["category_income_id"],
        },
        headers=account["headers"],
    )

    assert response.status_code == 201
    operation = response.json()
    assert operation["concept"] == "Salary"
    assert operation["type"] == "Income"
    assert operation["currency"] == "USD"


def test_create_expense_operation(client, funded_account):
    """An expense on a funded account debits it and exposes the canonical type value."""
    response = client.post(
        "/operations/new",
        json={
            "concept": "Groceries",
            "amount": 100.5,
            "type": "egreso",
            "account_id": funded_account["id"],
            "category_id": funded_account["category_id"],
        },
        headers=funded_account["headers"],
    )

    assert response.status_code == 201
    operation = response.json()
    assert operation["concept"] == "Groceries"
    assert operation["amount"] == 100.5
    assert operation["type"] == "Expense"
    assert operation["currency"] == "USD"


def test_balance_reflects_operations(client, funded_account):
    """The final account balance is funded balance minus the new debit."""
    client.post(
        "/operations/new",
        json={"concept": "Rent", "amount": 300, "type": "egreso", "account_id": funded_account["id"], "category_id": funded_account["category_id"]},
        headers=funded_account["headers"],
    )

    accounts = client.get("/accounts/", headers=funded_account["headers"]).json()
    assert accounts[0]["balance"] == 1100.0


@pytest.mark.parametrize(
    "amount,op_type",
    [
        pytest.param(400, "egreso", id="egreso-equal-to-balance"),
        pytest.param(500, "egreso", id="egreso-over-balance"),
        pytest.param(400, "transfer", id="transfer-equal-to-balance"),
        pytest.param(500, "transfer", id="transfer-over-balance"),
    ],
)
def test_debit_requires_balance_strictly_greater_than_amount(client, account, amount, op_type):
    category_id = (
        account["category_transfer_id"]
        if op_type == "transfer"
        else account["category_id"]
    )
    response = client.post(
        "/operations/new",
        json={"concept": "Too much", "amount": amount, "type": op_type, "account_id": account["id"], "category_id": category_id},
        headers=account["headers"],
    )

    assert response.status_code == 400
    assert "Insufficient balance" in response.json()["detail"]


@pytest.mark.parametrize(
    "amount",
    [0, -100],
    ids=["zero-amount", "negative-amount"],
)
def test_operation_with_non_positive_amount_returns_422(client, account, amount):
    response = client.post(
        "/operations/new",
        json={"concept": "Bad amount", "amount": amount, "type": "ingreso", "account_id": account["id"], "category_id": account["category_income_id"]},
        headers=account["headers"],
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "field,value",
    [
        pytest.param("concept", "x" * 251, id="concept-over-250"),
        pytest.param("name", "y" * 251, id="name-over-250"),
    ],
)
def test_operation_with_free_text_over_250_chars_returns_422(client, account, field, value):
    """`concept`/`name` are capped to the `Operation` column lengths (422, never a
    DataError from the persistence layer)."""
    payload = {
        "concept": "Funded",
        "amount": 10,
        "type": "ingreso",
        "account_id": account["id"],
        "category_id": account["category_income_id"],
        field: value,
    }
    response = client.post("/operations/new", json=payload, headers=account["headers"])

    assert response.status_code == 422


def test_operation_with_invalid_type_returns_400(client, account):
    response = client.post(
        "/operations/new",
        json={"concept": "Something", "amount": 10, "type": "bogus_type", "account_id": account["id"], "category_id": account["category_id"]},
        headers=account["headers"],
    )

    assert response.status_code == 400
    assert "Not valid operation type" in response.json()["detail"]


def test_expense_operation_persists_name(client, funded_account):
    response = client.post(
        "/operations/new",
        json={
            "concept": "Groceries",
            "amount": 50,
            "type": "egreso",
            "account_id": funded_account["id"],
            "category_id": funded_account["category_id"],
            "name": "Carrefour",
        },
        headers=funded_account["headers"],
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Carrefour"


def test_operation_with_matching_currency_is_accepted(client, account):
    response = client.post(
        "/operations/new",
        json={
            "concept": "Salary",
            "amount": 100,
            "type": "ingreso",
            "account_id": account["id"],
            "category_id": account["category_income_id"],
            "currency": "usd",
        },
        headers=account["headers"],
    )

    assert response.status_code == 201
    assert response.json()["currency"] == "USD"


def test_operation_with_mismatched_currency_returns_400(client, account):
    response = client.post(
        "/operations/new",
        json={
            "concept": "Wrong currency",
            "amount": 100,
            "type": "ingreso",
            "account_id": account["id"],
            "category_id": account["category_income_id"],
            "currency": "ARS",
        },
        headers=account["headers"],
    )

    assert response.status_code == 400
    assert "Currency mismatch" in response.json()["detail"]


def test_operation_with_unsupported_currency_returns_422(client, account):
    response = client.post(
        "/operations/new",
        json={
            "concept": "Weird currency",
            "amount": 100,
            "type": "ingreso",
            "account_id": account["id"],
            "category_id": account["category_income_id"],
            "currency": "EUR",
        },
        headers=account["headers"],
    )

    assert response.status_code == 422


def test_transfer_operation_defaults_name_to_other_and_debits_balance(client, funded_account):
    """A nameless transfer defaults to "Other" and debits the account like an expense."""
    response = client.post(
        "/operations/new",
        json={"concept": "Sent money", "amount": 100, "type": "transfer", "account_id": funded_account["id"], "category_id": funded_account["category_transfer_id"]},
        headers=funded_account["headers"],
    )

    assert response.status_code == 201
    operation = response.json()
    assert operation["type"] == "Transfer"
    assert operation["name"] == "Other"

    accounts = client.get("/accounts/", headers=funded_account["headers"]).json()
    assert accounts[0]["balance"] == 1300.0


def test_transfer_operation_with_name_keeps_given_value(client, funded_account):
    response = client.post(
        "/operations/new",
        json={
            "concept": "Sent money",
            "amount": 100,
            "type": "transfer",
            "account_id": funded_account["id"],
            "category_id": funded_account["category_transfer_id"],
            "name": "Juan Perez",
        },
        headers=funded_account["headers"],
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Juan Perez"


def test_operation_with_inactive_category_returns_400(client, account):
    response = client.post(
        "/operations/new",
        json={"concept": "Groceries", "amount": 10, "type": "egreso", "account_id": account["id"], "category_id": 999999},
        headers=account["headers"],
    )

    assert response.status_code == 400
    assert "does not exist or is inactive" in response.json()["detail"]


def test_operation_with_type_mismatched_category_returns_400(client, account):
    response = client.post(
        "/operations/new",
        json={
            "concept": "Salary",
            "amount": 100,
            "type": "ingreso",
            "account_id": account["id"],
            "category_id": account["category_id"],
        },
        headers=account["headers"],
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "is of type Expense but the operation is of type Income" in detail


def test_operation_on_other_users_account_returns_403(client, account, auth_headers):
    other_headers = auth_headers(name="intruder", email="intruder@example.com")

    response = client.post(
        "/operations/new",
        json={"concept": "Hack", "amount": 10, "type": "egreso", "account_id": account["id"], "category_id": account["category_id"]},
        headers=other_headers,
    )

    assert response.status_code == 403
    assert "does not belong" in response.json()["detail"]


def test_get_operations_filters_by_user(client, account, auth_headers):
    other_headers = auth_headers(name="stranger", email="stranger@example.com")

    client.post(
        "/operations/new",
        json={"concept": "Mine", "amount": 50, "type": "ingreso", "account_id": account["id"], "category_id": account["category_income_id"]},
        headers=account["headers"],
    )

    mine = client.get("/operations/", headers=account["headers"]).json()
    others = client.get("/operations/", headers=other_headers).json()

    assert len(mine) == 1
    assert others == []


def test_get_operations_lists_newest_first(client, account):
    """The listing contract is deterministic: `date desc, id desc` for same-date ops."""
    original = client.post(
        "/operations/new",
        json={"concept": "First", "amount": 10, "type": "ingreso", "account_id": account["id"], "category_id": account["category_income_id"]},
        headers=account["headers"],
    ).json()
    latest = client.post(
        "/operations/new",
        json={"concept": "Second", "amount": 10, "type": "ingreso", "account_id": account["id"], "category_id": account["category_income_id"]},
        headers=account["headers"],
    ).json()

    operations = client.get("/operations/", headers=account["headers"]).json()

    assert [op["id"] for op in operations] == [latest["id"], original["id"]]
    assert [op["concept"] for op in operations] == ["Second", "First"]


def test_get_single_operation_returns_own_operation(client, account):
    created = client.post(
        "/operations/new",
        json={"concept": "Salary", "amount": 100, "type": "ingreso", "account_id": account["id"], "category_id": account["category_income_id"]},
        headers=account["headers"],
    ).json()

    response = client.get(f"/operations/{created['id']}", headers=account["headers"])

    assert response.status_code == 200
    assert response.json()["concept"] == "Salary"
    assert response.json()["amount"] == 100.0


def test_get_single_operation_from_other_user_returns_404(client, account, auth_headers):
    created = client.post(
        "/operations/new",
        json={"concept": "Private", "amount": 100, "type": "ingreso", "account_id": account["id"], "category_id": account["category_income_id"]},
        headers=account["headers"],
    ).json()
    other_headers = auth_headers(name="snooper", email="snooper@example.com")

    response = client.get(f"/operations/{created['id']}", headers=other_headers)

    assert response.status_code == 404


def test_get_single_operation_nonexistent_returns_404(client, account):
    response = client.get("/operations/999999", headers=account["headers"])

    assert response.status_code == 404
