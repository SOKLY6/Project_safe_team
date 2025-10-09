import asyncio
from backend.api_client import register_user, get_organizations


async def main():
    print("Тестируем register_user()...")
    user = await register_user({
        "telegram_id": 123,
        "name": "Test User",
        "organization": "safe_team"
    })
    print("Результат:", user)

    print("\nТестируем get_organizations()...")
    orgs = await get_organizations()
    print("Результат:", orgs)

if __name__ == "__main__":
    asyncio.run(main())
