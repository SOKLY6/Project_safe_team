import pytest
from sqlalchemy import select

from app.models.organization import Organization
from app.models.user import User

pytestmark = pytest.mark.anyio


async def create_org(db_session, name='Org 1'):
    org = Organization(name=name)
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


async def test_register_user_success(client, db_session):
    org = await create_org(db_session)
    resp = await client.post(
        '/users/post',
        json={
            'telegram_id': 123,
            'name': 'Test User',
            'organization_id': org.id,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] > 0
    assert data['telegram_id'] == 123
    assert data['name'] == 'Test User'
    assert data['organization_id'] == org.id


async def test_register_user_duplicate_telegram(client, db_session):
    org = await create_org(db_session)
    user = User(telegram_id=123, name='User 1', organization_id=org.id)
    db_session.add(user)
    await db_session.commit()
    resp = await client.post(
        '/users/post',
        json={
            'telegram_id': 123,
            'name': 'Another User',
            'organization_id': org.id,
        },
    )
    assert resp.status_code == 400
    assert resp.json()['detail'] == 'User with this telegram_id already exists'


async def test_get_user_by_id_success(client, db_session):
    org = await create_org(db_session)
    user = User(telegram_id=123, name='User 1', organization_id=org.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    resp = await client.get(f'/users/by-id/{user.id}')
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] == user.id
    assert data['telegram_id'] == user.telegram_id
    assert data['name'] == user.name


async def test_get_user_by_id_not_found(client):
    resp = await client.get('/users/by-id/999')
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'User not found'


async def test_get_user_by_telegram_success(client, db_session):
    org = await create_org(db_session)
    user = User(telegram_id=123, name='User 1', organization_id=org.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    resp = await client.get(f'/users/by-telegram/{user.telegram_id}')
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] == user.id
    assert data['telegram_id'] == user.telegram_id
    assert data['name'] == user.name


async def test_get_user_by_telegram_not_found(client):
    resp = await client.get('/users/by-telegram/999')
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'User not found'


async def test_update_user_by_id_success(client, db_session):
    org = await create_org(db_session)
    user = User(telegram_id=123, name='Old Name', organization_id=org.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    resp = await client.put(
        f'/users/{user.id}',
        json={'name': 'New Name', 'organization_id': org.id},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] == user.id
    assert data['name'] == 'New Name'


async def test_update_user_by_id_not_found(client):
    resp = await client.put('/users/999', json={'name': 'New Name'})
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'User not found'


async def test_update_user_by_telegram_success(client, db_session):
    org = await create_org(db_session)
    user = User(telegram_id=123, name='Old Name', organization_id=org.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    resp = await client.put(
        f'/users/by-telegram/{user.telegram_id}', json={'name': 'New Name'}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] == user.id
    assert data['name'] == 'New Name'


async def test_update_user_by_telegram_not_found(client):
    resp = await client.put(
        '/users/by-telegram/999', json={'name': 'New Name'}
    )
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'User not found'


async def test_delete_user_by_id_success(client, db_session):
    org = await create_org(db_session)
    user = User(telegram_id=123, name='User 1', organization_id=org.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    resp = await client.delete(f'/users/{user.id}')
    assert resp.status_code == 204
    result = await db_session.execute(select(User).filter_by(id=user.id))
    deleted = result.scalars().first()
    assert deleted is None


async def test_delete_user_by_id_not_found(client):
    resp = await client.delete('/users/999')
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'User not found'


async def test_delete_user_by_telegram_success(client, db_session):
    org = await create_org(db_session)
    user = User(telegram_id=123, name='User 1', organization_id=org.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    resp = await client.delete(f'/users/by-telegram/{user.telegram_id}')
    assert resp.status_code == 204
    result = await db_session.execute(
        select(User).filter_by(telegram_id=user.telegram_id)
    )
    deleted = result.scalars().first()
    assert deleted is None


async def test_delete_user_by_telegram_not_found(client):
    resp = await client.delete('/users/by-telegram/999')
    assert resp.status_code == 404
    assert resp.json()['detail'] == 'User not found'
