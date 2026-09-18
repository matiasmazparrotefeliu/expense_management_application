"""Whitelist of currency codes accounts may be created in."""

import os

# Configurable via env so a deployment can support a different local currency
# without a schema migration — Account.currency is a plain String(3), not a SQLEnum.
SUPPORTED_CURRENCIES = {
    code.strip().upper()
    for code in os.getenv("SUPPORTED_CURRENCIES", "USD,ARS").split(",")
    if code.strip()
}

def validate_supported_currency(value: str) -> str:
    """Normalize to uppercase and reject any currency outside `SUPPORTED_CURRENCIES`.

    Shared by every schema that accepts a currency (`AccountCreate`,
    `CreateOperation`) so the error message and normalization rules stay identical."""
    value = value.strip().upper()
    if value not in SUPPORTED_CURRENCIES:
        raise ValueError(f"Unsupported currency, must be one of {sorted(SUPPORTED_CURRENCIES)}")
    return value