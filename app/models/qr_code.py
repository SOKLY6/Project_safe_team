from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from Project_safe_team.app.database import Base


class QRCode(Base):
    __tablename__ = 'qr_codes'

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    organization_id = Column(
        Integer, ForeignKey('organizations.id'), nullable=False
    )
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)

    user = relationship('User', back_populates='qr_codes')
    organization = relationship('Organization', back_populates='qr_codes')
    access_logs = relationship('AccessLog', back_populates='qr_code')
