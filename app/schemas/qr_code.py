from datetime import datetime

from pydantic import BaseModel, ConfigDict


class QRCodeCreateRequest(BaseModel):
    user_id: int
    organization_id: int


class QRCodeResponse(BaseModel):
    id: int
    code: str
    user_id: int
    organization_id: int
    created_at: datetime
    expires_at: datetime
    used: bool
    model_config = ConfigDict(from_attributes=True)


class QRCodeActiveResponse(BaseModel):
    id: int
    code: str
    user_name: str
    organization_id: int
    created_at: datetime
    expires_at: datetime
    model_config = ConfigDict(from_attributes=True)


class QRCodeVerify(BaseModel):
    qr_data: str
    scanner_id: str = 'web_scanner'
