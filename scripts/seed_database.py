import asyncio
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base, async_session, engine
from app.models.organization import Organization
from app.models.qr_code import QRCode
from app.models.staff import Staff, StaffRole
from app.models.user import User


async def create_organizations(session: AsyncSession):
    org_types = ['University', 'College', 'School']
    organizations = []
    for i in range(6):
        org = Organization(name=f'Test Org {i + 1} ({org_types[i % 3]})')
        organizations.append(org)
        session.add(org)
    await session.commit()
    return organizations


async def create_users(session: AsyncSession, organizations):
    users = []
    for i in range(10):
        user = User(
            telegram_id=1000 + i,
            name=f'User Test {i + 1}',
            organization_id=organizations[i % len(organizations)].id,
        )
        users.append(user)
        session.add(user)
    await session.commit()
    return users


async def create_staff(session: AsyncSession):
    guards = [
        Staff(
            username='guard1',
            hashed_password='hashedpwd1',
            role=StaffRole.GUARD,
        ),
        Staff(
            username='guard2',
            hashed_password='hashedpwd2',
            role=StaffRole.GUARD,
        ),
        Staff(
            username='admin1',
            hashed_password='hashedpwd3',
            role=StaffRole.ADMIN,
        ),
    ]
    session.add_all(guards)
    await session.commit()
    return guards


async def add_qr_codes(session: AsyncSession, users, organizations):
    qr_list = []
    for user in users:
        org = organizations[user.id % len(organizations)]
        qr = QRCode(
            code=f'QR-{user.id}-{datetime.now().timestamp()}',
            user_id=user.id,
            organization_id=org.id,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=7),
            used=False,
        )
        qr_list.append(qr)
        session.add(qr)
    await session.commit()
    return qr_list


async def seed_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        organizations = await create_organizations(session)
        users = await create_users(session, organizations)
        await create_staff(session)
        await add_qr_codes(session, users, organizations)

        print('Database seeded successfully!')


if __name__ == '__main__':
    asyncio.run(seed_database())
