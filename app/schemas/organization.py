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


class OrganizationResponse(OrganizationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
