import asyncio

import bcrypt
from sqlalchemy import select

from app.utils.database import get_db
from app.models.staff import Staff, StaffRole


async def create_admin():
    async for db in get_db():
        result = await db.execute(
            select(Staff).where(Staff.username == 'admin')
        )
        existing = result.scalar_one_or_none()

        if existing:
            print('❌ Admin already exists!')
            return

        hashed_password = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode(
            'utf-8'
        )

        admin = Staff(
            username='admin',
            hashed_password=hashed_password,
            role=StaffRole.ADMIN,
        )
        db.add(admin)
        await db.commit()
        print('✅ Admin created successfully!')
        print('   Username: admin')
        print('   Password: admin123')
        break  # Важно: выходим после первой сессии


if __name__ == '__main__':
    asyncio.run(create_admin())
