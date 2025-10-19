from pydantic import BaseModel, field_validator, ConfigDict


class QRCodeBase(BaseModel):
    code: str
    user_id: int
    organization_id: int


class QRCodeCreate(QRCodeBase):
    @field_validator('code')
    def validate_code(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError('QR code cannot be empty')
        return cleaned


class QRCodeResponse(QRCodeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
