"""ORM model for user accounts: the actual money-holding entity in the ledger."""

from sqlalchemy import (
    Column, Integer, String, Numeric, Boolean, DateTime,
    ForeignKey, CheckConstraint, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship
from ..db.config import Base

class Account(Base):
    """A single-currency balance owned by a user. A user may hold several accounts,
    in the same or different currencies (e.g. "Cash USD" and "Cash ARS")."""

    __tablename__ = 'accounts'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE', onupdate='CASCADE'),
                      nullable=False, index=True)
    name = Column(String(100), nullable=False)
    currency = Column(String(3), nullable=False)
    balance = Column(Numeric(14, 2), nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="accounts")
    operations = relationship("Operation", back_populates="account")

    __table_args__ = (
        CheckConstraint("balance >= 0", name="ck_accounts_balance_non_negative"),
        CheckConstraint("length(currency) = 3", name="ck_accounts_currency_len3"),
        UniqueConstraint("user_id", "name", name="uq_accounts_user_name"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "currency": self.currency,
            "balance": float(self.balance),
            "is_active": self.is_active,
        }
