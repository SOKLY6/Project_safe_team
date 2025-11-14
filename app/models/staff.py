from enum import Enum

from sqlalchemy import Column, Integer, String
from sqlalchemy import Enum as SQLEnum

from app.database import Base


class StaffRole(str, Enum):
    GUARD = 'guard'
    ADMIN = 'admin'


class Staff(Base):
    __tablename__ = 'staff'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(StaffRole), default=StaffRole.GUARD, nullable=False)
