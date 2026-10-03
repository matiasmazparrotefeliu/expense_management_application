"""Canonical mapping between the operation type strings the app and the AI accept.

Kept out of the service layer so both `OperationService` (manual creation) and
the AI extraction schema (`AIExtraction`) normalize type strings identically."""

from ..enums import OperationType

# Accepts both the Spanish and English spellings the client historically sent,
# so existing callers don't break when this was tightened to an exact match.
TYPE_ALIASES = {
    'egreso': OperationType.expense,
    'ingreso': OperationType.income,
    'expense': OperationType.expense,
    'income': OperationType.income,
    'transferencia': OperationType.transfer,
    'transfer': OperationType.transfer,
}

def normalize_operation_type(raw_type: str) -> OperationType:
    """Resolve a raw type string (Spanish or English) to an `OperationType`.

    Raises `ValueError` when the string does not match any known alias so both
    the service layer (HTTP 400) and the AI extraction validator can surface it."""
    op_type = TYPE_ALIASES.get(raw_type.strip().lower())
    if op_type is None:
        raise ValueError(
            f"Not valid operation type, you must enter one of {sorted(TYPE_ALIASES.keys())}"
        )
    return op_type