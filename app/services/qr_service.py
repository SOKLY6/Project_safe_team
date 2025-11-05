import hashlib
from datetime import datetime, timedelta

from decouple import config
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.qr_code import QRCode
from app.models.user import User


def generate_qr_data(user_id: int) -> str:
    timestamp = int(datetime.now().replace(tzinfo=None).timestamp())
    secret_key = config('QR_SECRET_KEY', default='default_secret')
    raw_string = f'USER_{user_id}_TIMESTAMP_{timestamp}_SECRET_{secret_key}'
    hash_value = hashlib.sha256(raw_string.encode()).hexdigest()[:16]
    return f'USER_{user_id}_TIMESTAMP_{timestamp}_SECRET_{hash_value}'


async def create_qr_code(
    user_id: int, organization_id: int, db: AsyncSession
) -> QRCode | None:
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not user:
        return None

    qr_data = generate_qr_data(user_id)
    lifetime = config('QR_LIFETIME_MINUTES', default=1, cast=int)
    expires = datetime.now().replace(tzinfo=None) + timedelta(minutes=lifetime)

    qr_code = QRCode(
        code=qr_data,
        user_id=user_id,
        organization_id=organization_id,
        expires_at=expires,
    )
    db.add(qr_code)
    await db.commit()
    await db.refresh(qr_code)
    return qr_code


async def get_active_qr_code(
    user_id: int, db: AsyncSession
) -> QRCode | None:
    result = await db.execute(
        select(QRCode)
        .where(
            QRCode.user_id == user_id,
            QRCode.used.is_(False),
            QRCode.expires_at > datetime.now().replace(tzinfo=None),
        )
        .order_by(QRCode.created_at.desc())
    )
    return result.scalars().first()
