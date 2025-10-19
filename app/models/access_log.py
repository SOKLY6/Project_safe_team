from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database import Base


class AccessLog(Base):
    __tablename__ = 'access_logs'

    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    organization_id = Column(
        Integer, ForeignKey('organizations.id'), nullable=False
    )
    qr_code_id = Column(Integer, ForeignKey('qr_codes.id'), nullable=False)

    user = relationship('User', back_populates='access_logs')
    organization = relationship('Organization', back_populates='access_logs')
    qr_code = relationship('QRCode', back_populates='access_logs')
