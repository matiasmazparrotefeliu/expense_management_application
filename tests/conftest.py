"""Pytest fixtures that exercise the FastAPI app in-process, with no Docker.

The app from `backend/main.py` is imported directly and driven through
`fastapi.testclient.TestClient`, so tests run entirely locally against the
repo-root test database (`expense_app_test.db`) and never touch the development
database (`expense_app.db`). `DB_URL` is forced to the absolute test path before
the import because the dev `.env` sets a development URL. The test file is
deleted at the start of every session so `create_all` always runs against a
fresh schema (SQLite never migrates). Per-test isolation truncates the test
file with a direct `sqlite3` connection (in foreign-key order); categories are
left untouched and seeded lazily by the `category` fixture.
"""

import os
import pathlib
import sqlite3
import sys

import pytest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"

# The app module resolves as `backend.main` (repo root on sys.path) and its
# imports run as top-level `src.*` (backend dir on sys.path).
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = REPO_ROOT / "expense_app_test.db"
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()
os.environ["DB_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"

from backend.main import app  # noqa: E402  (must run after DB_URL/sys.path are set)
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(autouse=True)
def truncate_tables():
    """Delete user data from the test DB before every test.

    Runs the deletes in foreign-key order (operations → accounts → users) and
    deliberately keeps `categories`, whose active catalog is shared across tests
    and lazily seeded by the `category` fixture when empty."""
    connection = sqlite3.connect(TEST_DB_PATH)
    try:
        connection.execute("DELETE FROM operations")
        connection.execute("DELETE FROM accounts")
        connection.execute("DELETE FROM users")
        connection.commit()
    finally:
        connection.close()


@pytest.fixture(scope="session")
def client():
    """In-process ASGI test client bound to the FastAPI app."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def category():
    """Return the id of an active, predefined category.

    Categories are never truncated, so we reuse the first active one. Only if the
    catalog were somehow empty (e.g. on a freshly created test DB) do we insert a
    fallback row directly into the test DB. The SQLite `type` column stores the
    enum member name (`expense`/`income`/`transfer`), so raw inserts use those."""
    connection = sqlite3.connect(TEST_DB_PATH)
    try:
        row = connection.execute(
            "SELECT id FROM categories WHERE is_active = 1 ORDER BY id LIMIT 1"
        ).fetchone()
        if row is None:
            cursor = connection.execute(
                "INSERT INTO categories (name, type, description, is_active) VALUES (?, ?, ?, 1)",
                ("test category", "expense", "Inserted by tests when the catalog is empty"),
            )
            connection.commit()
            return cursor.lastrowid
        return row[0]
    finally:
        connection.close()


@pytest.fixture
def category_factory():
    """Factory fixture: return the id of an active category of the given type
    (`expense`/`income`/`transfer`), inserting a fallback row when the typed
    catalog is empty on a fresh test DB."""
    def _get_for_type(operation_type_name):
        connection = sqlite3.connect(TEST_DB_PATH)
        try:
            row = connection.execute(
                "SELECT id FROM categories WHERE is_active = 1 AND type = ? ORDER BY id LIMIT 1",
                (operation_type_name,),
            ).fetchone()
            if row is None:
                cursor = connection.execute(
                    "INSERT INTO categories (name, type, description, is_active) VALUES (?, ?, ?, 1)",
                    (f"test {operation_type_name} category", operation_type_name,
                     "Inserted by tests when the typed catalog is empty"),
                )
                connection.commit()
                return cursor.lastrowid
            return row[0]
        finally:
            connection.close()

    return _get_for_type


@pytest.fixture
def auth_headers(client):
    """Factory fixture: registers (if needed) and logs in a user, returning a ready-to-use
    `Authorization` header dict. Call it more than once with different emails to
    get headers for distinct users within the same test."""
    def _register_and_login(name="matute92", email="matumazparrote@gmail.com", password="francia"):
        client.post("/users/new", json={"name": name, "email": email, "password": password})
        response = client.post("/users/login", json={"email": email, "password": password})
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _register_and_login


@pytest.fixture
def account_payload():
    """Factory: builds the canonical valid `/accounts/new` payload, overridable by keyword
    arguments. Every account-creation body in the test suite derives from here."""
    def _payload(**overrides):
        payload = {"name": "Home", "currency": "USD", "balance": 400, "bank": "Test Bank"}
        payload.update(overrides)
        return payload

    return _payload


@pytest.fixture
def account(client, auth_headers, category, category_factory, account_payload):
    """Create a valid account via the API and return its id plus auth headers and
    typed category ids (expense = `category_id`, income and transfer variants),
    tagged to the current user. Shared by every test file that needs an owned
    account."""
    headers = auth_headers()
    response = client.post("/accounts/new", json=account_payload(), headers=headers)
    assert response.status_code == 201
    return {
        "id": response.json()["id"],
        "headers": headers,
        "category_id": category,
        "category_income_id": category_factory("income"),
        "category_transfer_id": category_factory("transfer"),
    }