from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AccessLogBase(BaseModel):
    user_id: int | None = None
    organization_id: int | None = None
    qr_code_id: int | None = None
    scanner_id: str | None = None
    access_granted: bool
    reason: str | None = None


class AccessLogResponse(AccessLogBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
