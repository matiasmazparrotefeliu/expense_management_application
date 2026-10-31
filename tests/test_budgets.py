"""Tests for the monthly budget module: `BudgetLimit` management and the
salary-consumption summary (`GET /budgets/summary`).

The whole module is scoped to a single account (the summary and the limits
require `account_id`), which keeps every aggregate in that account's currency.
No real seeding is needed: the `account` fixture (conftest) already provides an
owned account plus expense/income/transfer/salary category ids, where the
salary one is flagged `is_budget_source = 1` (the rest are not), mirroring the
real "Sueldo" vs "Otros Ingresos" catalog. Every fixture bucket follows the
suite-wide consolidation: one parametrized test per behavior."""

import datetime
import pathlib
import sqlite3

import pytest

# Operations carry a server-generated date, so posting now lands inside the
# current fiscal month and the summary must be queried for the same period.
TODAY = datetime.datetime.utcnow()
YEAR = TODAY.year
MONTH = TODAY.month

# Same file conftest binds the app to (repo-root test DB, gitignored).
TEST_DB_PATH = pathlib.Path(__file__).resolve().parent.parent / "expense_app_test.db"


def post_operation(client, account, *, op_type, category_id, amount, concept):
    """Create an operation for the owned account (the canonical POST body)."""
    return client.post(
        "/operations/new",
        json={
            "concept": concept,
            "amount": amount,
            "type": op_type,
            "account_id": account["id"],
            "category_id": category_id,
        },
        headers=account["headers"],
    )


def seed_period_operations(client, account):
    """Canonical period: salary-like income (1000), plain income (100), an
    expense (250) and a transfer (150) — both debits consume the budget."""
    post_operation(client, account, op_type="ingreso", category_id=account["category_salary_id"], amount=1000, concept="Sueldo octubre")
    post_operation(client, account, op_type="ingreso", category_id=account["category_income_id"], amount=100, concept="Intereses banco")
    post_operation(client, account, op_type="egreso", category_id=account["category_id"], amount=250, concept="Compra super")
    post_operation(client, account, op_type="transfer", category_id=account["category_transfer_id"], amount=150, concept="Pago venta")


def test_summary_requires_authentication(client):
    response = client.get(f"/budgets/summary?account_id=1&year={YEAR}&month={MONTH}")
    assert response.status_code == 401


def test_active_periods_requires_authentication(client):
    response = client.get("/operations/active-periods?account_id=1")
    assert response.status_code == 401


@pytest.mark.parametrize(
    "endpoint,other_account",
    [
        pytest.param(f"/budgets/summary?year={{y}}&month={{m}}&account_id={{id}}", True, id="summary-foreign-account-403"),
        pytest.param(f"/budgets/summary?year={{y}}&month={{m}}&account_id=99999", False, id="summary-unknown-account-404"),
        pytest.param("/operations/active-periods?account_id={id}", True, id="periods-foreign-account-403"),
        pytest.param("/operations/active-periods?account_id=99999", False, id="periods-unknown-account-404"),
    ],
)
def test_account_endpoints_reject_foreign_or_unknown_accounts(client, account, auth_headers, account_payload, endpoint, other_account):
    """The per-account module is ownership-guarded through the centralized
    helper: another user's account is 403 and an unknown one is 404."""
    if other_account:
        other_headers = auth_headers(name="otro owner", email="owner@mail.com", password="Francia123")
        other_account_payload = client.post("/accounts/new", json=account_payload(), headers=other_headers).json()
        url = endpoint.format(y=YEAR, m=MONTH, id=other_account_payload["id"])
    else:
        url = endpoint.format(y=YEAR, m=MONTH, id=0)

    response = client.get(url, headers=account["headers"])
    assert response.status_code == (403 if other_account else 404)


def test_active_periods_lists_only_own_months_with_operations(client, account, auth_headers, account_payload):
    """`GET /operations/active-periods?account_id=` returns the fiscal months
    holding at least one operation of the selected account, newest first: a
    previous-month operation (inserted directly — the API stamps `utcnow`)
    shows up and a foreign user's month does not."""
    seed_period_operations(client, account)

    previous_month = MONTH - 1 if MONTH > 1 else 12
    previous_year = YEAR if MONTH > 1 else YEAR - 1
    next_month = MONTH + 1 if MONTH < 12 else 1
    next_year = YEAR if MONTH < 12 else YEAR + 1
    connection = sqlite3.connect(TEST_DB_PATH)
    try:
        connection.execute(
            "INSERT INTO operations (concept, amount, type, currency, date, account_id, category_id) "
            "VALUES ('old expense', 100, 'expense', 'USD', ?, ?, ?)",
            (f"{previous_year:04d}-{previous_month:02d}-15T00:00:00", account["id"], account["category_id"]),
        )
        connection.commit()
    finally:
        connection.close()

    other_headers = auth_headers(name="otro periodos", email="periodos@mail.com", password="Francia123")
    other_account = client.post("/accounts/new", json=account_payload(), headers=other_headers).json()
    connection = sqlite3.connect(TEST_DB_PATH)
    try:
        connection.execute(
            "INSERT INTO operations (concept, amount, type, currency, date, account_id, category_id) "
            "VALUES ('foreign future', 50, 'expense', 'USD', ?, ?, ?)",
            (f"{next_year:04d}-{next_month:02d}-15T00:00:00", other_account["id"], account["category_id"]),
        )
        connection.commit()
    finally:
        connection.close()

    response = client.get(f"/operations/active-periods?account_id={account['id']}", headers=account["headers"])
    assert response.status_code == 200
    periods = response.json()

    assert periods[0] == {"year": YEAR, "month": MONTH}
    assert {"year": previous_year, "month": previous_month} in periods
    assert len(periods) == 2
    assert periods == sorted(periods, key=lambda p: (p["year"], p["month"]), reverse=True)


@pytest.mark.parametrize(
    "expected_status,payload",
    [
        pytest.param(422, {"account_id": None, "category_id": None, "amount": 0, "month": MONTH, "year": YEAR}, id="zero-amount-422"),
        pytest.param(422, {"account_id": None, "category_id": None, "amount": -100, "month": MONTH, "year": YEAR}, id="negative-amount-422"),
        pytest.param(422, {"account_id": None, "category_id": None, "amount": 100, "month": 0, "year": YEAR}, id="month-zero-422"),
        pytest.param(422, {"account_id": None, "category_id": None, "amount": 100, "month": 13, "year": YEAR}, id="month-13-422"),
        pytest.param(422, {"account_id": None, "category_id": None, "amount": 100, "month": MONTH, "year": 1899}, id="year-below-422"),
        pytest.param(400, {"account_id": None, "category_id": 99999, "amount": 100, "month": MONTH, "year": YEAR}, id="unknown-category-400"),
    ],
)
def test_save_limit_rejects_invalid_payloads(client, account, expected_status, payload):
    """Schema rejections (amount/month/year) are 422; catalog rejections
    (unknown or inactive category) are the service's 400."""
    payload["account_id"] = account["id"]
    response = client.post("/budgets/", json=payload, headers=account["headers"])
    assert response.status_code == expected_status


def test_save_limit_rejects_income_category(client, account):
    """Income never consumes a budget, so an income category cap is a 400."""
    response = client.post(
        "/budgets/",
        json={"account_id": account["id"], "category_id": account["category_salary_id"], "amount": 100, "month": MONTH, "year": YEAR},
        headers=account["headers"],
    )
    assert response.status_code == 400
    assert "Income categories" in response.json()["detail"]


def test_save_limit_rejects_foreign_account(client, account, auth_headers, account_payload):
    """A cap cannot be attached to another user's account (403 through the
    ownership helper; an unknown account would be a 404)."""
    other_headers = auth_headers(name="otro tope", email="tope@mail.com", password="Francia123")
    other_account = client.post("/accounts/new", json=account_payload(), headers=other_headers).json()

    response = client.post(
        "/budgets/",
        json={"account_id": other_account["id"], "category_id": None, "amount": 100, "month": MONTH, "year": YEAR},
        headers=account["headers"],
    )
    assert response.status_code == 403


def test_global_limit_upserts_without_duplicating(client, account):
    """Saving the global cap twice updates the same row (amount follows)."""
    first = client.post(
        "/budgets/",
        json={"account_id": account["id"], "category_id": None, "amount": 500, "month": MONTH, "year": YEAR},
        headers=account["headers"],
    )
    second = client.post(
        "/budgets/",
        json={"account_id": account["id"], "category_id": None, "amount": 700, "month": MONTH, "year": YEAR},
        headers=account["headers"],
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["account_id"] == account["id"]

    limits = client.get(f"/budgets/?account_id={account['id']}&year={YEAR}&month={MONTH}", headers=account["headers"]).json()
    assert len(limits) == 1
    assert limits[0]["category_id"] is None
    assert limits[0]["amount"] == 700


def test_category_limit_is_saved_with_category_name(client, account):
    response = client.post(
        "/budgets/",
        json={"account_id": account["id"], "category_id": account["category_id"], "amount": 200, "month": MONTH, "year": YEAR},
        headers=account["headers"],
    )

    assert response.status_code == 200
    limit = response.json()
    assert limit["category_id"] == account["category_id"]
    assert limit["category_name"] is not None
    assert limit["category_name"] != "None"


def test_summary_reports_period_totals_and_category_breakdown(client, account):
    """The monthly snapshot: salary-only budget (excludes plain income),
    expense+transfer as consumption, net remainder and the per-category
    grouping with amounts, counts and percentage of the total spend."""
    seed_period_operations(client, account)

    response = client.get(f"/budgets/summary?account_id={account['id']}&year={YEAR}&month={MONTH}", headers=account["headers"])
    assert response.status_code == 200
    summary = response.json()

    assert summary["account_id"] == account["id"]
    assert summary["currency"] == "USD"
    assert summary["total_salary"] == 1000.0
    assert summary["total_income"] == 1100.0
    assert summary["total_expenses"] == 400.0
    assert summary["net_available"] == 600.0
    assert summary["consumption_percentage"] == 40.0
    assert summary["global_limit"] is None

    by_category = {row["category_id"]: row for row in summary["categories"]}
    expense_row = by_category[account["category_id"]]
    transfer_row = by_category[account["category_transfer_id"]]
    assert expense_row["amount"] == 250.0
    assert expense_row["count"] == 1
    assert expense_row["percentage"] == 62.5
    assert transfer_row["amount"] == 150.0
    assert transfer_row["count"] == 1
    assert transfer_row["percentage"] == 37.5


def test_summary_reports_progress_of_configured_limits(client, account):
    """Global and per-category caps come back with their usage: global counts
    every debit, category caps only that category's operations."""
    seed_period_operations(client, account)
    client.post("/budgets/", json={"account_id": account["id"], "category_id": None, "amount": 500, "month": MONTH, "year": YEAR}, headers=account["headers"])
    client.post("/budgets/", json={"account_id": account["id"], "category_id": account["category_id"], "amount": 200, "month": MONTH, "year": YEAR}, headers=account["headers"])

    response = client.get(f"/budgets/summary?account_id={account['id']}&year={YEAR}&month={MONTH}", headers=account["headers"])
    summary = response.json()

    assert summary["global_limit"]["amount"] == 500.0
    assert summary["global_limit"]["used"] == 400.0
    assert summary["global_limit"]["percentage"] == 80.0

    expense_row = next(
        row for row in summary["categories"] if row["category_id"] == account["category_id"]
    )
    assert expense_row["limit"]["amount"] == 200.0
    assert expense_row["limit"]["used"] == 250.0
    assert expense_row["limit"]["percentage"] == 125.0


def test_summary_is_scoped_to_own_accounts(client, account, auth_headers, account_payload):
    """Another user's operations never leak into the summary; since every
    aggregate is filtered by `account_id`, the isolation is exact."""
    seed_period_operations(client, account)
    other_headers = auth_headers(name="otro usuario", email="otro@mail.com", password="Francia123")
    other_account = client.post("/accounts/new", json=account_payload(), headers=other_headers).json()
    client.post(
        "/operations/new",
        json={
            "concept": "Gasto ajeno",
            "amount": 999,
            "type": "egreso",
            "account_id": other_account["id"],
            "category_id": client.get(
                "/categories/", headers=other_headers
            ).json()[0]["id"],
        },
        headers=other_headers,
    )

    response = client.get(f"/budgets/summary?account_id={account['id']}&year={YEAR}&month={MONTH}", headers=account["headers"])
    summary = response.json()

    assert summary["total_expenses"] == 400.0
    assert all(row["amount"] != 999 for row in summary["categories"])


def test_summary_ignores_operations_outside_the_period(client, account):
    """The fiscal cutoff is the calendar month: operations whose `date` falls in
    another month must not enter the aggregates (inserted directly because the
    API always stamps `utcnow`)."""
    seed_period_operations(client, account)

    previous_month = MONTH - 1 if MONTH > 1 else 12
    previous_year = YEAR if MONTH > 1 else YEAR - 1
    connection = sqlite3.connect(TEST_DB_PATH)
    try:
        connection.execute(
            "INSERT INTO operations (concept, amount, type, currency, date, account_id, category_id) "
            "VALUES ('old expense', 900, 'expense', 'USD', ?, ?, ?)",
            (f"{previous_year:04d}-{previous_month:02d}-15T00:00:00", account["id"], account["category_id"]),
        )
        connection.commit()
    finally:
        connection.close()

    response = client.get(f"/budgets/summary?account_id={account['id']}&year={YEAR}&month={MONTH}", headers=account["headers"])
    summary = response.json()
    assert summary["total_expenses"] == 400.0


def test_limit_delete_is_owner_scoped(client, account, auth_headers, account_payload):
    """Deleting foreign or nonexistent ids is a 404; own id removes the row."""
    client.post(
        "/budgets/",
        json={"account_id": account["id"], "category_id": None, "amount": 300, "month": MONTH, "year": YEAR},
        headers=account["headers"],
    )
    limits = client.get(f"/budgets/?account_id={account['id']}&year={YEAR}&month={MONTH}", headers=account["headers"]).json()

    other_headers = auth_headers(name="otro borrador", email="borrador@mail.com", password="Francia123")
    assert client.delete(f"/budgets/{limits[0]['id']}", headers=other_headers).status_code == 404
    assert client.delete("/budgets/99999", headers=account["headers"]).status_code == 404

    assert client.delete(f"/budgets/{limits[0]['id']}", headers=account["headers"]).status_code == 200
    assert client.get(f"/budgets/?account_id={account['id']}&year={YEAR}&month={MONTH}", headers=account["headers"]).json() == []
