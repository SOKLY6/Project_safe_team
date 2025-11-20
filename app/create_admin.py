import asyncio
from sqlalchemy import select
from app.database import engine, Base, async_session
from app.models.staff import Staff, StaffRole
from app.services.auth import get_password_hash


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        result = await db.execute(
            select(Staff).where(Staff.role == StaffRole.ADMIN)
        )
        if result.scalar_one_or_none():
            return

        admin = Staff(
            username='admin',
            hashed_password=get_password_hash('admin123'),
            role=StaffRole.ADMIN,
        )
        db.add(admin)
        await db.commit()


if __name__ == '__main__':
    asyncio.run(init_db())
