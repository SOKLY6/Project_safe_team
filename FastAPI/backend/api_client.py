import httpx

BASE_URL = "http://127.0.0.1:8000"


async def register_user(data: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.post(f"{BASE_URL}/register", json=data)
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            print("Ошибка: сервер недоступен.")
        except httpx.TimeoutException:
            print("Ошибка: превышено время ожидания.")
        except httpx.HTTPStatusError as e:
            print(f"Ошибка API: {e.response.status_code} — {e.response.text}")
        except Exception as e:
            print(f"Неизвестная ошибка: {e}")
        return None


async def get_organizations():
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.get(f"{BASE_URL}/organizations")
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            print("Ошибка: сервер недоступен.")
        except httpx.TimeoutException:
            print("Ошибка: превышено время ожидания.")
        except httpx.HTTPStatusError as e:
            print(f"Ошибка API: {e.response.status_code} — {e.response.text}")
        except Exception as e:
            print(f"Неизвестная ошибка: {e}")
        return []
