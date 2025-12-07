import logging
import os
from typing import Optional

import httpx

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")

logger = logging.getLogger(__name__)
logger.info(f"🔧 API_BASE_URL: {API_BASE_URL}")


class APIClient:
    def __init__(self, base_url: str = API_BASE_URL) -> None:
        self.base_url = base_url
        self.timeout = httpx.Timeout(10.0, connect=5.0)

    async def get_user_by_telegram_id(self, telegram_id: int) -> Optional[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/users/by-telegram/{telegram_id}"
                )

            if response.status_code == 200:
                return response.json()
            if response.status_code == 404:
                return None

            logger.error(f"Неожиданный статус {response.status_code}")
            return None

        except httpx.TimeoutException:
            logger.error(f"Timeout при запросе пользователя {telegram_id}")
            return None
        except httpx.ConnectError:
            logger.error("API не доступен. Проверьте, запущен ли FastAPI сервер")
            return None
        except Exception as exc:
            logger.error(f"Ошибка при запросе пользователя: {exc}")
            return None

    async def register_user(
        self,
        telegram_id: int,
        name: str,
        organization_id: int,
    ) -> Optional[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/users/post",
                    json={
                        "telegram_id": telegram_id,
                        "name": name,
                        "organization_id": organization_id,
                    },
                )

            if response.status_code == 200:
                return response.json()
            return None

        except httpx.TimeoutException:
            logger.error("Timeout при регистрации пользователя")
            return None
        except httpx.ConnectError:
            logger.error("API не доступен")
            return None
        except Exception as exc:
            logger.error(f"Ошибка при регистрации: {exc}")
            return None

    async def update_user(
        self,
        user_id: int,
        name: Optional[str] = None,
        organization_id: Optional[int] = None,
    ) -> bool:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                data: dict[str, object] = {}

                if name is not None:
                    data["name"] = name
                if organization_id is not None:
                    data["organization_id"] = organization_id

                response = await client.put(
                    f"{self.base_url}/users/{user_id}",
                    json=data,
                )

            return response.status_code == 200
        except Exception as exc:
            logger.error(f"Ошибка при обновлении пользователя: {exc}")
            return False

    async def get_organizations(self) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/organizations/")

            if response.status_code == 200:
                return response.json()
            return []
        except Exception as exc:
            logger.error(f"Ошибка при получении организаций: {exc}")
            return []

    async def generate_qr_code(
        self,
        user_id: int,
        organization_id: int,
    ) -> Optional[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/qr/generate",
                    json={
                        "user_id": user_id,
                        "organization_id": organization_id,
                    },
                )

            if response.status_code == 200:
                return response.json()
            return None
        except Exception as exc:
            logger.error(f"Ошибка при генерации QR: {exc}")
            return None

    async def get_user_qr_codes(self, user_id: int) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/qr/user/{user_id}"
                )

            if response.status_code == 200:
                return response.json()
            return []
        except Exception as exc:
            logger.error(f"Ошибка при получении QR кодов: {exc}")
            return []


api_client = APIClient()
