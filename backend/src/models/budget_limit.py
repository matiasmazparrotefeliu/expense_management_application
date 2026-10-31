"""ORM model for user-configured monthly spending caps (budgets)."""

from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, func
from sqlalchemy.orm import relationship

from ..db.config import Base

class BudgetLimit(Base):
    """A user-defined maximum spend for a fiscal period (month + year), scoped
    to a specific `Account` — expenses are aggregated per account, which keeps
    every total in a single currency and mirrors how the dashboard filters the
    operations table.

    `category_id IS NULL` means the limit is global (applies to the sum of every
    debit of the period in that account); otherwise it caps the expense/transfer
    operations of that catalog category. Limits are per-user, per-account and
    per-period, so a different budget can be set for each month/account.
    Duplicate (user, account, period, category) rows are rejected at the DB
    level for set categories; the global (`category_id IS NULL`) uniqueness is
    enforced by the service via upsert, since SQL engines treat NULLs as
    distinct in unique keys."""

    __tablename__ = "budget_limits"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE', onupdate='CASCADE'),
                     nullable=False, index=True)
    account_id = Column(Integer, ForeignKey('accounts.id', ondelete='CASCADE', onupdate='CASCADE'),
                        nullable=False, index=True)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='RESTRICT', onupdate='CASCADE'),
                         nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    account = relationship("Account")
    category = relationship("Category", back_populates="budget_limits")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_budget_limits_amount_positive"),
        UniqueConstraint("user_id", "account_id", "year", "month", "category_id",
                         name="uq_budget_limits_user_account_period_category"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "account_id": self.account_id,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "amount": float(self.amount),
            "month": self.month,
            "year": self.year,
        }
