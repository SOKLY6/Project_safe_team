import bcrypt
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.staff import Staff, StaffRole
from app.services import dependencies
from app.utils.database import Base, get_db


@pytest.fixture(scope='session')
def anyio_backend():
    return 'asyncio'


@pytest.fixture(scope='function')
async def db_session():
    engine = create_async_engine('sqlite+aiosqlite:///:memory:', future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    AsyncSessionLocal = sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )
    async with AsyncSessionLocal() as session:
        yield session
    await engine.dispose()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode(
        'utf-8'
    )


@pytest.fixture
async def admin_staff(db_session):
    admin = Staff(
        username='admin',
        hashed_password=hash_password('password123'),
        role=StaffRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest.fixture
async def regular_staff(db_session):
    staff = Staff(
        username='user',
        hashed_password=hash_password('password123'),
        role=StaffRole.GUARD,
    )
    db_session.add(staff)
    await db_session.commit()
    await db_session.refresh(staff)
    return staff


@pytest.fixture(scope='function')
async def client(db_session, admin_staff, regular_staff):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[dependencies.get_current_admin] = (
        lambda: admin_staff
    )
    app.dependency_overrides[dependencies.get_current_staff] = (
        lambda: regular_staff
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as ac:
        yield ac

    app.dependency_overrides.clear()
