from enum import Enum as PyEnum

class OperationType(str,PyEnum):
    expense = 'Expense'
    income = "Income"
    transfer = "Transfer"