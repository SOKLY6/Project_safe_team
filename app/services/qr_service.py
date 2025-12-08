import hashlib
import secrets
from datetime import datetime, timedelta

from decouple import config
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.qr_code import QRCode
from app.models.user import User


def generate_qr_data(user_id: int) -> str:
    secret_key = config('QR_SECRET_KEY', default='default_secret')
    random_bytes = secrets.token_bytes(16)
    raw_string = f'USER_{user_id}_{secret_key}_{random_bytes.hex()}'
    hash_value = hashlib.sha256(raw_string.encode()).hexdigest()[:16]
    timestamp = int(datetime.now().replace(tzinfo=None).timestamp())
    return f'USER_{user_id}_TIMESTAMP_{timestamp}_SECRET_{hash_value}'


async def get_active_qr_code(user_id: int, db: AsyncSession) -> QRCode | None:
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


async def create_qr_code(
    user_id: int, organization_id: int, db: AsyncSession
) -> QRCode | None:
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not user:
        return None

    existing = await get_active_qr_code(user_id, db)
    if existing:
        return existing

    lifetime = config('QR_LIFETIME_MINUTES', default=1, cast=int)
    expires = datetime.now().replace(tzinfo=None) + timedelta(minutes=lifetime)

    for _ in range(5):
        qr_data = generate_qr_data(user_id)
        qr_code = QRCode(
            code=qr_data,
            user_id=user_id,
            organization_id=organization_id,
            expires_at=expires,
        )
        db.add(qr_code)
        try:
            await db.commit()
            await db.refresh(qr_code)
            return qr_code
        except IntegrityError:
            await db.rollback()
            continue

    return None
