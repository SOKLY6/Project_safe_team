import pytest
from sqlalchemy import select

from app.models.staff import Staff, StaffRole

pytestmark = pytest.mark.anyio


async def test_login_success(client, db_session, admin_staff):
    resp = await client.post(
        '/auth/login',
        json={'username': 'admin', 'password': 'password123'},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert 'access_token' in data
    assert data['token_type'] == 'bearer'


async def test_get_me_success(client, regular_staff):
    resp = await client.get('/auth/me')

    assert resp.status_code == 200
    data = resp.json()
    assert data['username'] == regular_staff.username
    assert data['id'] == regular_staff.id


async def test_list_staff_success(
    client, db_session, admin_staff, regular_staff
):
    resp = await client.get('/auth/staff')

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    usernames = [s['username'] for s in data]
    assert 'admin' in usernames
    assert 'user' in usernames


async def test_list_staff_returns_all_roles(client, db_session):
    result = await db_session.execute(select(Staff))
    all_staff = result.scalars().all()
    for s in all_staff:
        await db_session.delete(s)
    await db_session.commit()

    admin = Staff(
        username='admin1',
        hashed_password='hash1',
        role=StaffRole.ADMIN,
    )
    guard = Staff(
        username='guard1',
        hashed_password='hash2',
        role=StaffRole.GUARD,
    )
    db_session.add_all([admin, guard])
    await db_session.commit()

    resp = await client.get('/auth/staff')

    assert resp.status_code == 200
    data = resp.json()
    roles = [s['role'] for s in data]
    assert StaffRole.ADMIN.value in roles or 'ADMIN' in roles
    assert StaffRole.GUARD.value in roles or 'GUARD' in roles
