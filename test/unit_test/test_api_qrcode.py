from datetime import datetime, timedelta

import pytest
from sqlalchemy import select

from app.models.organization import Organization
from app.models.qr_code import QRCode
from app.models.user import User

pytestmark = pytest.mark.anyio


async def create_org(db_session, name='Test Org'):
    org = Organization(name=name)
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


async def create_user(
    db_session,
    telegram_id=12345,
    name='Test User',
    username='testuser',
    org=None,
):
    if org is None:
        org = await create_org(db_session)
    user = User(
        telegram_id=telegram_id,
        name=name,
        username=username,
        hashed_password='hashed',
        organization_id=org.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_generate_qr_success(client, db_session):
    org = await create_org(db_session)
    user = await create_user(db_session, username='user1', org=org)

    resp = await client.post(
        '/qr/generate',
        json={'user_id': user.id, 'organization_id': org.id},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data['id'] > 0
    assert data['user_id'] == user.id
    assert data['organization_id'] == org.id


async def test_generate_qr_user_not_found(client):
    resp = await client.post(
        '/qr/generate',
        json={'user_id': 999, 'organization_id': 1},
    )

    assert resp.status_code == 404
    assert resp.json()['detail'] == 'User not found'


async def test_get_user_qr_codes_success(client, db_session):
    user = await create_user(db_session, username='user2')
    qr1 = QRCode(
        user_id=user.id,
        organization_id=user.organization_id,
        code='code1',
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    qr2 = QRCode(
        user_id=user.id,
        organization_id=user.organization_id,
        code='code2',
        expires_at=datetime.utcnow() + timedelta(minutes=20),
    )
    db_session.add_all([qr1, qr2])
    await db_session.commit()

    resp = await client.get(f'/qr/user/{user.id}')

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


async def test_get_user_qr_codes_empty(client, db_session):
    user = await create_user(db_session, username='user3')

    resp = await client.get(f'/qr/user/{user.id}')

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 0


async def test_get_active_qr_not_found(client, db_session):
    user = await create_user(db_session, username='user5')

    resp = await client.get(f'/qr/active/{user.id}')

    assert resp.status_code == 404
    assert resp.json()['detail'] == 'No active QR code found'


async def test_get_active_qr_success(client, db_session):
    user = await create_user(db_session, username='user4')

    resp = await client.post(
        '/qr/generate',
        json={'user_id': user.id, 'organization_id': user.organization_id},
    )
    assert resp.status_code == 200
    qr_data = resp.json()

    resp = await client.get(f'/qr/active/{user.id}')

    assert resp.status_code == 200
    data = resp.json()
    assert data['user_id'] == user.id
    assert data['id'] == qr_data['id']


async def test_update_qr_not_found(client):
    resp = await client.put(
        '/qr/update/999',
        json={'user_id': 1, 'organization_id': 1},
    )

    assert resp.status_code == 404
    assert resp.json()['detail'] == 'QR code not found'


async def test_update_qr_user_not_found(client, db_session):
    user = await create_user(db_session, username='user7')
    qr = QRCode(
        user_id=user.id,
        organization_id=user.organization_id,
        code='code',
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db_session.add(qr)
    await db_session.commit()
    await db_session.refresh(qr)

    resp = await client.put(
        f'/qr/update/{qr.id}',
        json={'user_id': 999, 'organization_id': user.organization_id},
    )

    assert resp.status_code == 404
    assert resp.json()['detail'] == 'User not found'


async def test_get_active_qr_codes_list(client, db_session):
    org = await create_org(db_session)
    user = await create_user(db_session, username='user8', org=org)
    qr = QRCode(
        user_id=user.id,
        organization_id=org.id,
        code='active',
        used=False,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db_session.add(qr)
    await db_session.commit()

    resp = await client.get('/qr/active')

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1


async def test_get_active_qr_codes_by_organization(client, db_session):
    org1 = await create_org(db_session, name='Org 1')
    org2 = await create_org(db_session, name='Org 2')
    user1 = await create_user(
        db_session, telegram_id=111, username='user9', org=org1
    )
    user2 = await create_user(
        db_session, telegram_id=222, username='user10', org=org2
    )

    qr1 = QRCode(
        user_id=user1.id,
        organization_id=org1.id,
        code='qr1',
        used=False,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    qr2 = QRCode(
        user_id=user2.id,
        organization_id=org2.id,
        code='qr2',
        used=False,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db_session.add_all([qr1, qr2])
    await db_session.commit()

    resp = await client.get(f'/qr/active?organization_id={org1.id}')

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert all(qr['organization_id'] == org1.id for qr in data)


async def test_delete_qr_success(client, db_session):
    user = await create_user(db_session, username='user11')
    qr = QRCode(
        user_id=user.id,
        organization_id=user.organization_id,
        code='to_delete',
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db_session.add(qr)
    await db_session.commit()
    await db_session.refresh(qr)

    resp = await client.delete(f'/qr/delete/{qr.id}')

    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] == 'success'

    result = await db_session.execute(select(QRCode).filter_by(id=qr.id))
    deleted = result.scalars().first()
    assert deleted is None


async def test_delete_qr_not_found(client):
    resp = await client.delete('/qr/delete/999')

    assert resp.status_code == 404
    assert resp.json()['detail'] == 'QR code not found'
