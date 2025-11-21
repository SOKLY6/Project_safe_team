import pytest


@pytest.mark.anyio
async def test_full_registration_and_qr_flow(client):
    """
    Полный цикл:
    1. Создаём организацию
    2. Регистрируем пользователя с этой организацией
    3. Генерируем QR-код
    4. Проверяем валидный QR
    5. Проверяем невалидный QR
    """

    resp = await client.post(
        "/organizations/",
        json={"name": "Test Organization"},
    )
    assert resp.status_code == 200
    org = resp.json()
    org_id = org["id"]

    resp = await client.post(
        "/users/post",
        json={
            "telegram_id": 123456,
            "name": "Test User",
            "organization_id": org_id,
        },
    )
    assert resp.status_code == 200
    user = resp.json()
    user_id = user["id"]

    resp = await client.post(
        "/qr/generate",
        json={
            "user_id": user_id,
            "organization_id": org_id,
        },
    )
    assert resp.status_code == 200
    qr = resp.json()
    qr_code = qr["code"]

    resp = await client.post(
        "/qr/verify",
        json={
            "qr_data": qr_code,
            "scanner_id": "scanner-test-1",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "granted"
    assert data["user_info"]["id"] == user_id

    resp = await client.post(
        "/qr/verify",
        json={
            "qr_data": "USER_999_TIMESTAMP_0_SECRET_deadbeefdeadbeef",
            "scanner_id": "scanner-test-1",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("invalid", "denied", "expired")
