import pytest
from sqlalchemy import select

from app.models.organization import Organization
from app.models.staff import Staff, StaffRole

pytestmark = pytest.mark.anyio


async def create_org(db_session, name='Test Org'):
    org = Organization(name=name)
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


async def test_create_staff_success(client, db_session):
    resp = await client.post(
        '/auth/register',
        json={'username': 'newstaff', 'password': 'secure_pass'},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data['username'] == 'newstaff'
    assert data['id'] > 0


async def test_get_staff_list(client, admin_staff, regular_staff):
    resp = await client.get('/auth/staff')

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2


async def test_delete_staff_success(client, db_session):
    staff = Staff(
        username='to_delete',
        hashed_password='hashed',
        role=StaffRole.GUARD,
    )
    db_session.add(staff)
    await db_session.commit()
    await db_session.refresh(staff)

    resp = await client.delete(f'/auth/staff/{staff.id}')

    assert resp.status_code == 204

    result = await db_session.execute(select(Staff).filter_by(id=staff.id))
    deleted = result.scalars().first()
    assert deleted is None


async def test_delete_staff_not_found(client):
    resp = await client.delete('/auth/staff/9999')

    assert resp.status_code == 404
    assert resp.json()['detail'] == 'Staff not found'
