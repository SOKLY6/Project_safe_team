from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.utils.database import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    organization_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('organizations.id'), nullable=True
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    organization = relationship('Organization', back_populates='users')
    qr_codes = relationship(
        'QRCode', back_populates='user', cascade='all, delete-orphan'
    )
    access_logs = relationship(
        'AccessLog', back_populates='user', cascade='all, delete-orphan'
    )
