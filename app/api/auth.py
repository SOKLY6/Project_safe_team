from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.staff import Staff
from app.schemas.staff import (
    StaffCreate,
    StaffLogin,
    StaffResponse,
    Token,
)
from app.services.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.services.dependencies import get_current_admin, get_current_staff
from app.utils.database import get_db

router = APIRouter(prefix='/auth', tags=['Authentication'])


@router.post('/register', response_model=StaffResponse)
async def register(
    staff_data: StaffCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Staff = Depends(get_current_admin),
):
    result = await db.execute(
        select(Staff).where(Staff.username == staff_data.username)
    )
    existing_staff = result.scalar_one_or_none()

    if existing_staff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Username already registered',
        )

    new_staff = Staff(
        username=staff_data.username,
        hashed_password=get_password_hash(staff_data.password),
    )
    db.add(new_staff)
    await db.commit()
    await db.refresh(new_staff)
    return new_staff


@router.post('/login', response_model=Token)
async def login(
    login_data: StaffLogin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Staff).where(Staff.username == login_data.username)
    )
    staff = result.scalar_one_or_none()

    if not staff or not verify_password(
        login_data.password, staff.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect username or password',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={'sub': staff.username, 'role': staff.role},
        expires_delta=access_token_expires,
    )
    return {'access_token': access_token, 'token_type': 'bearer'}


@router.get('/me', response_model=StaffResponse)
async def get_me(
    current_staff: Staff = Depends(get_current_staff),
):
    return current_staff


@router.delete('/staff/{staff_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Staff = Depends(get_current_admin),
):
    if current_admin.id == staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Cannot delete yourself',
        )

    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='Staff not found'
        )

    await db.delete(staff)
    await db.commit()


@router.get('/staff', response_model=list[StaffResponse])
async def list_staff(
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(get_current_admin),
):
    result = await db.execute(select(Staff))
    staff_list = result.scalars().all()
    return staff_list
