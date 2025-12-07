from pydantic import BaseModel


class UserBase(BaseModel):
    telegram_id: int
    name: str
    organization_id: int | None = None


class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    organization_id: int | None = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserBindTelegram(BaseModel):
    telegram_id: int


class UserUpdate(BaseModel):
    name: str | None = None
    organization_id: int | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    organization_id: int | None = None
    telegram_id: int | None = None
