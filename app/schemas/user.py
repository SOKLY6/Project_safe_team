from pydantic import BaseModel, field_validator, ConfigDict


class UserBase(BaseModel):
    telegram_id: int
    name: str
    organization_id: int | None = None


class UserCreate(UserBase):
    @field_validator('name')
    def validate_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Name cannot be empty')
        return value.strip()


class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    name: str | None = None
    organization_id: int | None = None
