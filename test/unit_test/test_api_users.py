import pytest
from sqlalchemy import select

from app.models.organization import Organization
from app.models.user import User

pytestmark = pytest.mark.anyio


async def create_org(db_session, name='Test Org'):
    org = Organization(name=name)
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


async def test_bind_telegram_success(client, db_session):
    org = await create_org(db_session)
    user = User(
        name='User',
        username='binduser1',
        hashed_password='hash',
        organization_id=org.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    resp = await client.put(
        f'/users/{user.id}/bind-telegram',
        json={'telegram_id': 99999},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data['telegram_id'] == 99999

    result = await db_session.execute(select(User).filter_by(id=user.id))
    updated_user = result.scalars().first()
    assert updated_user.telegram_id == 99999


async def test_bind_telegram_user_not_found(client):
    resp = await client.put(
        '/users/999/bind-telegram',
        json={'telegram_id': 99999},
    )

    assert resp.status_code == 404
    assert resp.json()['detail'] == 'User not found'


async def test_bind_telegram_already_bound(client, db_session):
    org = await create_org(db_session)
    user = User(
        telegram_id=12345,
        name='User',
        username='binduser2',
        hashed_password='hash',
        organization_id=org.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    resp = await client.put(
        f'/users/{user.id}/bind-telegram',
        json={'telegram_id': 54321},
    )

    assert resp.status_code == 400
    assert resp.json()['detail'] == 'Telegram already bound for this user'


async def test_bind_telegram_id_already_used(client, db_session):
    org = await create_org(db_session)
    user1 = User(
        telegram_id=12345,
        name='User1',
        username='binduser3',
        hashed_password='hash',
        organization_id=org.id,
    )
    user2 = User(
        name='User2',
        username='binduser4',
        hashed_password='hash',
        organization_id=org.id,
    )
    db_session.add_all([user1, user2])
    await db_session.commit()
    await db_session.refresh(user2)

    resp = await client.put(
        f'/users/{user2.id}/bind-telegram',
        json={'telegram_id': 12345},
    )

    assert resp.status_code == 400
    assert resp.json()['detail'] == 'This telegram_id is already used'


async def test_register_user_success(client, db_session):
    org = await create_org(db_session)

    resp = await client.post(
        '/users/register',
        json={
            'username': 'newuser',
            'password': 'pass123',
            'name': 'New User',
            'organization_id': org.id,
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data['username'] == 'newuser'
    assert data['name'] == 'New User'
    assert data['organization_id'] == org.id


async def test_register_user_duplicate_username(client, db_session):
    org = await create_org(db_session)
    user = User(
        username='dup',
        hashed_password='hashed',
        name='User',
        organization_id=org.id,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        '/users/register',
        json={
            'username': 'dup',
            'password': 'pass',
            'name': 'Another',
            'organization_id': org.id,
        },
    )

    assert resp.status_code == 400
    assert resp.json()['detail'] == 'Username already exists'


async def test_login_user_success(client, db_session):
    org = await create_org(db_session)
    from app.services.auth import get_password_hash

    user = User(
        username='testuser',
        hashed_password=get_password_hash('password123'),
        name='Test',
        organization_id=org.id,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        '/users/login',
        json={'username': 'testuser', 'password': 'password123'},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data['username'] == 'testuser'


async def test_login_user_invalid_credentials(client):
    resp = await client.post(
        '/users/login',
        json={'username': 'wrong', 'password': 'wrong'},
    )

    assert resp.status_code == 401
    assert resp.json()['detail'] == 'Invalid username or password'


async def test_login_user_wrong_password(client, db_session):
    org = await create_org(db_session)
    from app.services.auth import get_password_hash

    user = User(
        username='testuser2',
        hashed_password=get_password_hash('correct_password'),
        name='Test',
        organization_id=org.id,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        '/users/login',
        json={'username': 'testuser2', 'password': 'wrong_password'},
    )

    assert resp.status_code == 401
    assert resp.json()['detail'] == 'Invalid username or password'
