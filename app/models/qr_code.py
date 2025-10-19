from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class QRCode(Base):
    __tablename__ = 'qr_codes'

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    organization_id = Column(
        Integer, ForeignKey('organizations.id'), nullable=False
    )

    user = relationship('User', back_populates='qr_codes')
    organization = relationship('Organization', back_populates='qr_codes')
