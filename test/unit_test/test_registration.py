import pytest

pytestmark = pytest.mark.anyio


@pytest.mark.anyio
async def test_full_registration_and_qr_flow(client):
    """
    Полный цикл:
    1. Создаём организацию
    2. Регистрируем пользователя с этой организацией
    3. Генерируем QR-код
    4. Проверяем валидный QR
    """

    resp = await client.post(
        '/organizations/',
        json={'name': 'Test Organization'},
    )
    assert resp.status_code == 200
    org = resp.json()
    org_id = org['id']

    resp = await client.post(
        '/users/register',
        json={
            'username': 'testuser',
            'password': 'testpass',
            'name': 'Test User',
            'organization_id': org_id,
        },
    )
    assert resp.status_code == 200
    user = resp.json()
    user_id = user['id']

    resp = await client.post(
        '/qr/generate',
        json={
            'user_id': user_id,
            'organization_id': org_id,
        },
    )
    assert resp.status_code == 200
    qr = resp.json()
    assert qr['user_id'] == user_id
    assert qr['organization_id'] == org_id
