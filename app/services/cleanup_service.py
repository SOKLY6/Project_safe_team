import asyncio
from datetime import datetime, timedelta

from sqlalchemy import delete

from app.models.qr_code import QRCode
from app.utils.database import async_session


async def cleanup_expired_qr_codes() -> None:
    while True:
        async with async_session() as session:
            cutoff = datetime.now().replace(tzinfo=None) - timedelta(minutes=2)
            await session.execute(
                delete(QRCode).where(QRCode.expires_at < cutoff)
            )
            await session.commit()
        await asyncio.sleep(60)
