import re
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.ws import notify_all_clients
from app.models.access_log import AccessLog
from app.models.organization import Organization
from app.models.qr_code import QRCode
from app.models.user import User

rate_limit_store = defaultdict(list)


def validate_qr_format(qr_data: str) -> bool:
    pattern = r'^USER_\d+_TIMESTAMP_\d+_SECRET_[a-f0-9]{16}$'
    return bool(re.match(pattern, qr_data))


def validate_timestamp(expires_at: datetime) -> bool:
    return expires_at > datetime.now().replace(tzinfo=None)


def check_rate_limit(
    scanner_id: str, limit: int = 20, window_minutes: int = 1
) -> bool:
    now = datetime.now()
    cutoff = now - timedelta(minutes=window_minutes)
    rate_limit_store[scanner_id] = [
        ts for ts in rate_limit_store[scanner_id] if ts > cutoff
    ]
    if len(rate_limit_store[scanner_id]) >= limit:
        return False
    rate_limit_store[scanner_id].append(now)
    return True


async def check_user_access(
    user_id: int, organization_id: int, db: AsyncSession
) -> bool:
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not user:
        return False
    return user.organization_id == organization_id


async def verify_qr_code(
    qr_data: str, scanner_id: str, db: AsyncSession
) -> dict:
    if not check_rate_limit(scanner_id):
        await db_add_log(
            db,
            scanner_id=scanner_id,
            access_granted=False,
            reason='Rate limit exceeded',
        )
        return {
            'status': 'denied',
            'message': 'Rate limit exceeded',
            'user_info': None,
        }

    if not validate_qr_format(qr_data):
        await db_add_log(
            db,
            scanner_id=scanner_id,
            access_granted=False,
            reason='Invalid QR format',
        )
        return {
            'status': 'invalid',
            'message': 'Invalid QR code format',
            'user_info': None,
        }

    qr_token = (
        await db.execute(select(QRCode).where(QRCode.code == qr_data))
    ).scalar_one_or_none()

    if not qr_token:
        await db_add_log(
            db,
            scanner_id=scanner_id,
            access_granted=False,
            reason='Token not found',
        )
        return {
            'status': 'denied',
            'message': 'Token not found',
            'user_info': None,
        }

    if qr_token.used:
        await db_add_log(
            db,
            user_id=qr_token.user_id,
            organization_id=qr_token.organization_id,
            qr_code_id=qr_token.id,
            scanner_id=scanner_id,
            access_granted=False,
            reason='Token already used',
        )
        return {
            'status': 'denied',
            'message': 'Token already used',
            'user_info': None,
        }

    if not validate_timestamp(qr_token.expires_at):
        await db_add_log(
            db,
            user_id=qr_token.user_id,
            organization_id=qr_token.organization_id,
            qr_code_id=qr_token.id,
            scanner_id=scanner_id,
            access_granted=False,
            reason='Token expired',
        )
        return {
            'status': 'expired',
            'message': 'Token expired',
            'user_info': None,
        }

    user = (
        await db.execute(select(User).where(User.id == qr_token.user_id))
    ).scalar_one_or_none()

    if not user:
        await db_add_log(
            db,
            user_id=qr_token.user_id,
            organization_id=qr_token.organization_id,
            qr_code_id=qr_token.id,
            scanner_id=scanner_id,
            access_granted=False,
            reason='User not found',
        )
        return {
            'status': 'denied',
            'message': 'User not found',
            'user_info': None,
        }

    if not await check_user_access(user.id, qr_token.organization_id, db):
        await db_add_log(
            db,
            user_id=qr_token.user_id,
            organization_id=qr_token.organization_id,
            qr_code_id=qr_token.id,
            scanner_id=scanner_id,
            access_granted=False,
            reason='Access denied: organization mismatch',
        )
        return {
            'status': 'denied',
            'message': 'Access denied',
            'user_info': None,
        }

    qr_token.used = True

    await db_add_log(
        db,
        user_id=user.id,
        organization_id=qr_token.organization_id,
        qr_code_id=qr_token.id,
        scanner_id=scanner_id,
        access_granted=True,
        reason='Access granted',
    )

    return {
        'status': 'granted',
        'message': 'Access granted',
        'user_info': {
            'id': user.id,
            'name': user.name,
            'telegram_id': user.telegram_id,
            'organization_id': user.organization_id,
        },
    }


async def db_add_log(
    db: AsyncSession,
    user_id: int | None = None,
    organization_id: int | None = None,
    qr_code_id: int | None = None,
    scanner_id: str | None = None,
    access_granted: bool = False,
    reason: str | None = None,
):
    log_entry = AccessLog(
        user_id=user_id,
        organization_id=organization_id,
        qr_code_id=qr_code_id,
        scanner_id=scanner_id,
        access_granted=access_granted,
        reason=reason,
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    user = None
    org = None

    if user_id:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

    if organization_id:
        org_result = await db.execute(
            select(Organization).where(Organization.id == organization_id)
        )
        org = org_result.scalar_one_or_none()

    await notify_all_clients(
        {
            'type': 'access_log',
            'id': log_entry.id,
            'timestamp': log_entry.timestamp.isoformat(),
            'user_id': user_id,
            'user_name': user.name if user else None,
            'organization_id': organization_id,
            'organization_name': org.name if org else None,
            'qr_code_id': qr_code_id,
            'scanner_id': scanner_id,
            'access_granted': access_granted,
            'reason': reason,
        }
    )
