from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from Project_safe_team.app.database import Base


class AccessLog(Base):
    __tablename__ = 'access_logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    organization_id = Column(
        Integer, ForeignKey('organizations.id'), nullable=False
    )
    qr_code_id = Column(Integer, ForeignKey('qr_codes.id'), nullable=False)
    timestamp = Column(DateTime, default=datetime.now, nullable=False)
    access_granted = Column(Boolean, nullable=False)
    reason = Column(String(255), nullable=True)

    user = relationship('User', back_populates='access_logs')
    organization = relationship('Organization', back_populates='access_logs')
    qr_code = relationship('QRCode', back_populates='access_logs')
