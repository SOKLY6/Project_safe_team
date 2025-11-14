from pydantic import BaseModel

from app.models.staff import StaffRole


class StaffBase(BaseModel):
    username: str


class StaffCreate(StaffBase):
    password: str


class StaffLogin(BaseModel):
    username: str
    password: str


class StaffResponse(StaffBase):
    id: int
    role: StaffRole

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None
    role: StaffRole | None = None
