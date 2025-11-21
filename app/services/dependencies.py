from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.staff import Staff, StaffRole
from app.schemas.staff import TokenData
from app.services.auth import ALGORITHM, SECRET_KEY
from app.utils.database import get_db

security = HTTPBearer()


async def get_current_staff(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> Staff:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get('sub')
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception from None

    result = await db.execute(
        select(Staff).where(Staff.username == token_data.username)
    )
    staff = result.scalar_one_or_none()
    if staff is None:
        raise credentials_exception
    return staff


async def get_current_admin(
    current_staff: Annotated[Staff, Depends(get_current_staff)],
) -> Staff:
    if current_staff.role != StaffRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Not enough permissions',
        )
    return current_staff
