import logging
import os
from typing import Optional

import httpx

API_BASE_URL = os.getenv('API_BASE_URL', 'http://127.0.0.1:8000')
logger = logging.getLogger(__name__)

logger.info(f'🔧 API_BASE_URL: {API_BASE_URL}')


class APIClient:
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.timeout = httpx.Timeout(10.0, connect=5.0)

    async def get_user_by_telegram_id(
        self, telegram_id: int
    ) -> Optional[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f'{self.base_url}/users/by-telegram/{telegram_id}'
                )
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None
                else:
                    logger.error(f'Неожиданный статус {response.status_code}')
                    return None
        except httpx.TimeoutException:
            logger.error(f'Timeout при запросе пользователя {telegram_id}')
            return None
        except httpx.ConnectError:
            logger.error(
                'API не доступен. Проверьте, запущен ли FastAPI сервер'
            )
            return None
        except Exception as e:
            logger.error(f'Ошибка при запросе пользователя: {e}')
            return None

    async def register_user(
        self, telegram_id: int, name: str, organization_id: int
    ) -> Optional[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f'{self.base_url}/users/post',
                    json={
                        'telegram_id': telegram_id,
                        'name': name,
                        'organization_id': organization_id,
                    },
                )
                if response.status_code == 200:
                    return response.json()
                return None
        except httpx.TimeoutException:
            logger.error('Timeout при регистрации пользователя')
            return None
        except httpx.ConnectError:
            logger.error('API не доступен')
            return None
        except Exception as e:
            logger.error(f'Ошибка при регистрации: {e}')
            return None

    async def update_user(
        self,
        user_id: int,
        name: str = None,
        organization_id: int = None,
        telegram_id: int = None,
    ) -> bool:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                data = {}
                if name:
                    data['name'] = name
                if organization_id:
                    data['organization_id'] = organization_id
                if telegram_id:
                    data['telegram_id'] = telegram_id
                response = await client.put(
                    f'{self.base_url}/users/{user_id}', json=data
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f'Ошибка при обновлении пользователя: {e}')
            return False

    async def login_user(self, username: str, password: str) -> Optional[dict]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(
                f'{self.base_url}/users/login',
                json={'username': username, 'password': password},
            )
            return r.json() if r.status_code == 200 else None

    async def bind_telegram(
        self, user_id: int, telegram_id: int
    ) -> Optional[dict]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.put(
                f'{self.base_url}/users/{user_id}/bind-telegram',
                json={'telegram_id': telegram_id},
            )
            return r.json() if r.status_code == 200 else None

    async def get_organizations(self) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f'{self.base_url}/organizations/')
                if response.status_code == 200:
                    return response.json()
                return []
        except Exception as e:
            logger.error(f'Ошибка при получении организаций: {e}')
            return []

    async def generate_qr_code(
        self, user_id: int, organization_id: int
    ) -> Optional[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f'{self.base_url}/qr/generate',
                    json={
                        'user_id': user_id,
                        'organization_id': organization_id,
                    },
                )
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception as e:
            logger.error(f'Ошибка при генерации QR: {e}')
            return None

    async def get_user_qr_codes(self, user_id: int) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f'{self.base_url}/qr/user/{user_id}'
                )
                if response.status_code == 200:
                    return response.json()
                return []
        except Exception as e:
            logger.error(f'Ошибка при получении QR кодов: {e}')
            return []


api_client = APIClient()
