import time

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.models import Organization, QRCode, User
from app.services.qr_service import create_qr_code

DATABASE_URL = 'sqlite+aiosqlite:///./test.db'


@pytest.mark.asyncio
async def test_generate_qr_codes_safe():
    """
    Нагрузочный тест генерации QR-кодов с гарантией уникальности.

    Этот тест:
    1. Создаёт временную базу SQLite и инициализирует таблицы.
    2. Создаёт организацию и 5 пользователей.
    3. Генерирует 200 QR-кодов, распределяя их между пользователями.
       - Если генерируемый код уже существует (IntegrityError),
         выполняется повторная попытка генерации.
    4. Сохраняет все QR-коды в базе и проверяет, что все они сохранены.

    Использует:
    - SQLAlchemy AsyncSession для работы с базой.
    - Ловлю IntegrityError для обеспечения уникальности QR-кодов.
    """
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args={'check_same_thread': False},
    )
    AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        org = Organization(name='TestOrg')
        session.add(org)
        await session.commit()
        await session.refresh(org)

        users = []
        for i in range(5):
            user = User(
                telegram_id=1000 + i, name=f'User{i}', organization_id=org.id
            )
            session.add(user)
            users.append(user)
        await session.commit()

    results = []
    start_time = time.perf_counter()

    async with AsyncSessionLocal() as session:
        for i in range(200):
            user = users[i % len(users)]
            while True:
                try:
                    qr = await create_qr_code(user.id, org.id, session)
                    await session.commit()
                    results.append(qr)
                    break
                except IntegrityError:
                    await session.rollback()

    end_time = time.perf_counter()
    print(
        f'Generated {len(results)} QR codes in {end_time - start_time:.2f} seconds'
    )

    async with AsyncSessionLocal() as session:
        qr_count = await session.scalar(select(func.count(QRCode.id)))
        assert qr_count == len(results), 'Не все QR-коды сохранились!'
