from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Organization(Base):
    __tablename__ = 'organizations'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    users = relationship(
        'User', 
        back_populates='organization',
        cascade='all, delete-orphan'
    )
    qr_codes = relationship(
        'QRCode',
        back_populates='organization',
        cascade='all, delete-orphan'
    )
    access_logs = relationship(
        'AccessLog',
        back_populates='organization',
        cascade='all, delete-orphan'
    )
