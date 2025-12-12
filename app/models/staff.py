from enum import Enum

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.utils.database import Base


class StaffRole(str, Enum):
    GUARD = 'guard'
    ADMIN = 'admin'


class Staff(Base):
    __tablename__ = 'staff'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(
        String, unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[StaffRole] = mapped_column(
        default=StaffRole.GUARD, nullable=False
    )
