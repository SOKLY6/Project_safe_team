from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class OrganizationBase(BaseModel):
    name: str


class OrganizationCreate(OrganizationBase):
    @field_validator('name')
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError('Organization name cannot be empty')
        return cleaned


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None

    @field_validator('name')
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError('Organization name cannot be empty')
        return cleaned


class OrganizationResponse(OrganizationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
