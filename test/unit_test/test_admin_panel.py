import pytest
from app.models.staff import Staff, StaffRole
from app.services.auth import get_password_hash


@pytest.mark.anyio
async def test_admin_login_success(db_session):
    """Успешный логин админа"""
    admin = Staff(
        username="testadmin",
        hashed_password=get_password_hash("admin123"),
        role=StaffRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/auth/login",
            json={"username": "testadmin", "password": "admin123"},
        )
    
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.anyio
async def test_admin_login_wrong_password(db_session):
    """Ошибка при неверном пароле"""
    admin = Staff(
        username="admin2",
        hashed_password=get_password_hash("admin123"),
        role=StaffRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/auth/login",
            json={"username": "admin2", "password": "wrongpass"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 401
    assert "Incorrect" in resp.json()["detail"]


@pytest.mark.anyio
async def test_get_me_authenticated(db_session):
    """GET /auth/me возвращает текущего юзера"""
    admin = Staff(
        username="testadmin3",
        hashed_password=get_password_hash("pass"),
        role=StaffRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/auth/login",
            json={"username": "testadmin3", "password": "pass"},
        )
        token = resp.json()["access_token"]

        resp = await ac.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "testadmin3"
    assert data["role"] == "admin"


@pytest.mark.anyio
async def test_get_me_unauthenticated(db_session):
    """GET /auth/me без токена возвращает 403"""
    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/auth/me")

    app.dependency_overrides.clear()

    assert resp.status_code == 403


@pytest.mark.anyio
async def test_list_staff_as_admin(db_session):
    """Админ видит список всех сотрудников"""
    admin = Staff(
        username="admin4",
        hashed_password=get_password_hash("pass"),
        role=StaffRole.ADMIN,
    )
    guard = Staff(
        username="guard1",
        hashed_password=get_password_hash("pass"),
        role=StaffRole.GUARD,
    )
    db_session.add(admin)
    db_session.add(guard)
    await db_session.commit()

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/auth/login",
            json={"username": "admin4", "password": "pass"},
        )
        token = resp.json()["access_token"]

        resp = await ac.get(
            "/auth/staff",
            headers={"Authorization": f"Bearer {token}"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    staff_list = resp.json()
    assert len(staff_list) >= 2
    usernames = [s["username"] for s in staff_list]
    assert "admin4" in usernames
    assert "guard1" in usernames


@pytest.mark.anyio
async def test_list_staff_as_guard_forbidden(db_session):
    """Guard не может получить список сотрудников"""
    guard = Staff(
        username="guard2",
        hashed_password=get_password_hash("pass"),
        role=StaffRole.GUARD,
    )
    db_session.add(guard)
    await db_session.commit()

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/auth/login",
            json={"username": "guard2", "password": "pass"},
        )
        token = resp.json()["access_token"]

        resp = await ac.get(
            "/auth/staff",
            headers={"Authorization": f"Bearer {token}"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 403


@pytest.mark.anyio
async def test_register_staff_as_admin(db_session):
    """Админ может зарегистрировать нового guard"""
    admin = Staff(
        username="admin5",
        hashed_password=get_password_hash("pass"),
        role=StaffRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/auth/login",
            json={"username": "admin5", "password": "pass"},
        )
        token = resp.json()["access_token"]

        resp = await ac.post(
            "/auth/register",
            json={"username": "newguard", "password": "securepass", "role": "guard"},
            headers={"Authorization": f"Bearer {token}"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "newguard"
    assert data["role"] == "guard"


@pytest.mark.anyio
async def test_register_staff_duplicate_username(db_session):
    """Нельзя зарегистрировать staff с существующим username"""
    admin = Staff(
        username="admin6",
        hashed_password=get_password_hash("pass"),
        role=StaffRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/auth/login",
            json={"username": "admin6", "password": "pass"},
        )
        token = resp.json()["access_token"]

        resp = await ac.post(
            "/auth/register",
            json={"username": "admin6", "password": "newpass"},
            headers={"Authorization": f"Bearer {token}"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_delete_staff_as_admin(db_session):
    """Админ может удалить другого staff"""
    admin = Staff(
        username="admin7",
        hashed_password=get_password_hash("pass"),
        role=StaffRole.ADMIN,
    )
    guard = Staff(
        username="guard3",
        hashed_password=get_password_hash("pass"),
        role=StaffRole.GUARD,
    )
    db_session.add(admin)
    db_session.add(guard)
    await db_session.commit()
    await db_session.refresh(guard)
    guard_id = guard.id

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/auth/login",
            json={"username": "admin7", "password": "pass"},
        )
        token = resp.json()["access_token"]

        resp = await ac.delete(
            f"/auth/staff/{guard_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 204


@pytest.mark.anyio
async def test_delete_self_forbidden(db_session):
    """Админ не может удалить сам себя"""
    admin = Staff(
        username="admin8",
        hashed_password=get_password_hash("pass"),
        role=StaffRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    admin_id = admin.id

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/auth/login",
            json={"username": "admin8", "password": "pass"},
        )
        token = resp.json()["access_token"]

        resp = await ac.delete(
            f"/auth/staff/{admin_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 400
    assert "Cannot delete yourself" in resp.json()["detail"]
