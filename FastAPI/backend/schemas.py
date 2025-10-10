from pydantic import BaseModel


class UserCreate(BaseModel):
    telegram_id: int
    name: str
    organization: str | None = None


class UserResponse(BaseModel):
    id: int
    telegram_id: int
    name: str
    organization: str | None = None

    class Config:
        orm_mode = True


class Organization(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True
