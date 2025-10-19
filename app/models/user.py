from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    organization_id = Column(
        Integer, ForeignKey('organizations.id'), nullable=True
    )

    organization = relationship('Organization', back_populates='users')
    qr_codes = relationship('QRCode', back_populates='user')
