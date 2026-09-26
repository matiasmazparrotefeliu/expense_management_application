"""ORM model for the predefined operation categories catalog."""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum as SQLEnum, func
from sqlalchemy.orm import relationship

from ..db.config import Base
from ..enums import OperationType

class Category(Base):
    """A predefined label operations can be classified under. Every category is
    tied to an `OperationType` (`expense`, `income` or `transfer`), which the
    service enforces when creating operations. Categories are retired via
    `is_active` rather than deleted, since `Operation.category_id` restricts
    deletion of a category still in use."""

    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, index=True)
    type = Column(SQLEnum(OperationType), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    operations = relationship("Operation", back_populates="category")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "description": self.description,
            "is_active": self.is_active,
        }
