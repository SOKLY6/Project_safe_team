import pytest
from sqlalchemy import select

from app.models.organization import Organization

pytestmark = pytest.mark.anyio


async def test_create_organization_success(client, db_session):
    resp = await client.post('/organizations/', json={'name': 'Org 1'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] > 0
    assert data['name'] == 'Org 1'
    result = await db_session.execute(
        select(Organization).filter_by(id=data['id'])
    )
    org_in_db = result.scalars().first()
    assert org_in_db is not None
    assert org_in_db.name == 'Org 1'


async def test_create_organization_duplicate_name(client, db_session):
    org = Organization(name='Org 1')
    db_session.add(org)
    await db_session.commit()
    resp = await client.post('/organizations/', json={'name': 'Org 1'})
    assert resp.status_code == 400
    assert (
        resp.json()['detail'] == 'Organization with this name already exists'
    )


async def test_get_organization_by_id_success(client, db_session):
    org = Organization(name='Org 1')
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    resp = await client.get(f'/organizations/{org.id}')
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] == org.id
    assert data['name'] == org.name


async def test_get_organization_by_id_not_found(client):
    resp = await client.get('/organizations/999')
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'Organization not found'


async def test_update_organization_success(client, db_session):
    org = Organization(name='Old Name')
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    resp = await client.put(
        f'/organizations/{org.id}', json={'name': 'New Name'}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] == org.id
    assert data['name'] == 'New Name'


async def test_update_organization_not_found(client):
    resp = await client.put('/organizations/999', json={'name': 'New Name'})
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'Organization not found'


async def test_update_organization_duplicate_name(client, db_session):
    org1 = Organization(name='Org 1')
    org2 = Organization(name='Org 2')
    db_session.add_all([org1, org2])
    await db_session.commit()
    await db_session.refresh(org2)
    resp = await client.put(
        f'/organizations/{org2.id}', json={'name': 'Org 1'}
    )
    assert resp.status_code == 400
    assert (
        resp.json()['detail'] == 'Organization with this name already exists'
    )


async def test_delete_organization_success(client, db_session):
    org = Organization(name='Org 1')
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    resp = await client.delete(f'/organizations/{org.id}')
    assert resp.status_code == 204
    result = await db_session.execute(
        select(Organization).filter_by(id=org.id)
    )
    deleted = result.scalars().first()
    assert deleted is None


async def test_delete_organization_not_found(client):
    resp = await client.delete('/organizations/999')
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'Organization not found'
