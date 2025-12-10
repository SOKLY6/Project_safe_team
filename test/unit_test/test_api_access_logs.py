from datetime import datetime

import pytest

from app.models.access_log import AccessLog
from app.models.organization import Organization
from app.models.user import User

pytestmark = pytest.mark.anyio


async def create_org(db_session, name='Test Org'):
    org = Organization(name=name)
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


async def create_user(
    db_session, telegram_id=12345, name='User', username='testuser', org=None
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


async def test_get_access_logs_success(client, db_session):
    org = await create_org(db_session)
    user = await create_user(db_session, username='loguser1', org=org)

    log = AccessLog(
        user_id=user.id,
        organization_id=org.id,
        qr_code_id=1,
        scanner_id=1,
        access_granted=True,
        reason='Valid QR code',
        timestamp=datetime.utcnow(),
    )
    db_session.add(log)
    await db_session.commit()

    resp = await client.get('/access-logs/')

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]['user_id'] == user.id
    assert data[0]['organization_id'] == org.id
    assert data[0]['access_granted'] is True


async def test_get_access_logs_with_limit(client, db_session):
    org = await create_org(db_session)
    user = await create_user(db_session, username='loguser2', org=org)

    for i in range(10):
        log = AccessLog(
            user_id=user.id,
            organization_id=org.id,
            qr_code_id=i + 1,
            scanner_id=1,
            access_granted=True,
            timestamp=datetime.utcnow(),
        )
        db_session.add(log)
    await db_session.commit()

    resp = await client.get('/access-logs/?limit=5')

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 5


async def test_get_access_logs_with_offset(client, db_session):
    org = await create_org(db_session)
    user = await create_user(db_session, username='loguser3', org=org)

    for i in range(5):
        log = AccessLog(
            user_id=user.id,
            organization_id=org.id,
            qr_code_id=i + 1,
            scanner_id=1,
            access_granted=True,
            timestamp=datetime.utcnow(),
        )
        db_session.add(log)
    await db_session.commit()

    resp = await client.get('/access-logs/?offset=3')

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


async def test_get_access_logs_limit_and_offset(client, db_session):
    org = await create_org(db_session)
    user = await create_user(db_session, username='loguser4', org=org)

    for i in range(20):
        log = AccessLog(
            user_id=user.id,
            organization_id=org.id,
            qr_code_id=i + 1,
            scanner_id=1,
            access_granted=i % 2 == 0,
            timestamp=datetime.utcnow(),
        )
        db_session.add(log)
    await db_session.commit()

    resp = await client.get('/access-logs/?limit=10&offset=5')

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 10


async def test_get_access_logs_empty(client):
    resp = await client.get('/access-logs/')

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


async def test_get_access_logs_invalid_limit(client):
    resp = await client.get('/access-logs/?limit=1000')

    assert resp.status_code == 422


async def test_get_access_logs_invalid_offset(client):
    resp = await client.get('/access-logs/?offset=-1')

    assert resp.status_code == 422
