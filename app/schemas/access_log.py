from pydantic import BaseModel, ConfigDict


class AccessLogBase(BaseModel):
    user_id: int
    organization_id: int
    qr_code_id: int


class AccessLogResponse(AccessLogBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
