from typing import AsyncGenerator

from decouple import config
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

DATABASE_URL = config(
    'DATABASE_URL', default='postgresql+asyncpg://user:password@db:5432/dbname'
)

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
