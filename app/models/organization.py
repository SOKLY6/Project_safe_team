from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.database import Base


class Organization(Base):
    __tablename__ = 'organizations'

    name = Column(String(100), unique=True, nullable=False)

    users = relationship('User', back_populates='organization')
    qr_codes = relationship('QRCode', back_populates='organization')
    access_logs = relationship('AccessLog', back_populates='organization')
