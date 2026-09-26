PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def test_from_receipt_without_token_returns_401(client):
    response = client.post(
        "/operations/from-receipt",
        files={"file": ("receipt.png", PNG_BYTES, "image/png")},
        data={"account_id": "1"},
    )

    assert response.status_code == 401


def test_from_receipt_with_unsupported_extension_returns_422(client, account):
    """Extension validation runs before any DB/AI work, so no API key is needed."""
    response = client.post(
        "/operations/from-receipt",
        files={"file": ("receipt.txt", b"hello", "text/plain")},
        data={"account_id": str(account["id"])},
        headers=account["headers"],
    )

    assert response.status_code == 422
    assert "Unsupported receipt format" in response.json()["detail"]


def test_from_receipt_with_unknown_account_returns_404(client, account):
    response = client.post(
        "/operations/from-receipt",
        files={"file": ("receipt.png", PNG_BYTES, "image/png")},
        data={"account_id": "999999"},
        headers=account["headers"],
    )

    assert response.status_code == 404


def test_from_receipt_on_foreign_account_returns_403(client, account, auth_headers):
    other_headers = auth_headers(name="intruder", email="intruder@example.com")

    response = client.post(
        "/operations/from-receipt",
        files={"file": ("receipt.png", PNG_BYTES, "image/png")},
        data={"account_id": str(account["id"])},
        headers=other_headers,
    )

    assert response.status_code == 403
    assert "does not belong" in response.json()["detail"]