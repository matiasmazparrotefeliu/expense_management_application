"""ORM model for income/expense operations recorded against an account."""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum as SQLEnum, CheckConstraint, func
from sqlalchemy.orm import relationship
import datetime

from ..db.config import Base
from ..enums import OperationType

class Operation(Base):
    """A single ledger entry against an `Account`. `amount` is always positive; the
    sign applied to the account balance is derived from `type` (`income` credits the
    account, `expense`/`transfer` debit it), not from `amount`. `currency` is a
    snapshot of the account's currency at creation time. `name` holds the merchant
    (purchase), service (payment/subscription), or person (transfer) associated with
    the operation, depending on `category`/`type`; it defaults to "Other" for
    `transfer` operations when not supplied (see `OperationService.create_new`)."""

    __tablename__ = 'operations'
    id = Column(Integer, primary_key=True, index=True)
    concept = Column(String(250), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(SQLEnum(OperationType), nullable=False, index=True)
    currency = Column(String(3), nullable=False)
    date = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)

    account_id = Column(Integer, ForeignKey('accounts.id', ondelete='CASCADE', onupdate='CASCADE'),
                         nullable=False, index=True)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='RESTRICT', onupdate='CASCADE'),
                          nullable=False, index=True)
    name = Column(String(250), nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    account = relationship("Account", back_populates="operations")
    category = relationship("Category", back_populates="operations")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_operations_amount_positive"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "concept": self.concept,
            "amount": float(self.amount),
            "type": self.type.value,
            "currency": self.currency,
            "date": self.date.isoformat(),
            "account_id": self.account_id,
            "category_id": self.category_id,
            "category": self.category.to_dict() if self.category else None,
            "name": self.name,
        }
