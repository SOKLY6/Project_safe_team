import pytest
from sqlalchemy import select

from app.models.staff import Staff, StaffRole

pytestmark = pytest.mark.anyio


async def test_register_staff_success(client, db_session):
    resp = await client.post(
        '/auth/register',
        json={'username': 'new_staff', 'password': 'password123'},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] > 0
    assert data['username'] == 'new_staff'


async def test_register_staff_duplicate_username(client, db_session):
    existing = Staff(
        username='dup', hashed_password='hashed', role=StaffRole.GUARD
    )
    db_session.add(existing)
    await db_session.commit()
    resp = await client.post(
        '/auth/register', json={'username': 'dup', 'password': 'pass2'}
    )
    assert resp.status_code == 400
    assert resp.json()['detail'] == 'Username already registered'


async def test_login_wrong_credentials(client):
    resp = await client.post(
        '/auth/login', json={'username': 'unknown', 'password': 'wrong'}
    )
    assert resp.status_code == 401
    assert resp.json()['detail'] == 'Incorrect username or password'


async def test_delete_staff_success(client, db_session):
    staff = Staff(
        username='to_delete', hashed_password='hashed', role=StaffRole.GUARD
    )
    db_session.add(staff)
    await db_session.commit()
    await db_session.refresh(staff)
    resp = await client.delete(f'/auth/staff/{staff.id}')
    assert resp.status_code == 204
    result = await db_session.execute(select(Staff).filter_by(id=staff.id))
    deleted = result.scalars().first()
    assert deleted is None


async def test_delete_staff_cannot_delete_self(
    client, admin_staff, db_session
):
    resp = await client.delete(f'/auth/staff/{admin_staff.id}')
    assert resp.status_code == 400
    assert resp.json()['detail'] == 'Cannot delete yourself'


async def test_delete_staff_not_found(client):
    resp = await client.delete('/auth/staff/999')
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'Staff not found'
