from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class QRCode(Base):
    __tablename__ = 'qr_codes'

    code = Column(String(255), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    organization_id = Column(
        Integer, ForeignKey('organizations.id'), nullable=False
    )

    user = relationship('User', back_populates='qr_codes')
    organization = relationship('Organization', back_populates='qr_codes')
    access_logs = relationship('AccessLog', back_populates='qr_code')
