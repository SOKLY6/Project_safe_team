from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import user as models
from app.schemas import user as schemas
from app.services.auth import get_password_hash, verify_password
from app.utils.database import get_db

router = APIRouter(prefix='/users', tags=['Users'])


@router.put('/{user_id}/bind-telegram', response_model=schemas.UserResponse)
async def bind_telegram(
    user_id: int,
    data: schemas.UserBindTelegram,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found'
        )

    if user.telegram_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Telegram already bound for this user',
        )

    result = await db.execute(
        select(models.User).where(models.User.telegram_id == data.telegram_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='This telegram_id is already used',
        )

    user.telegram_id = data.telegram_id
    await db.commit()
    await db.refresh(user)
    return user


@router.get('/by-id/{user_id}', response_model=schemas.UserResponse)
async def get_user_by_id(
    user_id: int, db: AsyncSession = Depends(get_db)
) -> schemas.UserResponse:
    result = await db.execute(
        select(models.User).filter(models.User.id == user_id)
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found'
        )

    return db_user


@router.put('/{user_id}', response_model=schemas.UserResponse)
async def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found'
        )

    if user_update.name is not None:
        db_user.name = user_update.name
    if user_update.organization_id is not None:
        db_user.organization_id = user_update.organization_id
    if user_update.telegram_id is not None:
        result = await db.execute(
            select(models.User).where(
                models.User.telegram_id == user_update.telegram_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Telegram ID уже привязан',
            )
        db_user.telegram_id = user_update.telegram_id

    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.put('/by-telegram/{telegram_id}', response_model=schemas.UserResponse)
async def update_user_by_telegram_id(
    telegram_id: int,
    user_update: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
) -> schemas.UserResponse:
    result = await db.execute(
        select(models.User).filter(models.User.telegram_id == telegram_id)
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found'
        )

    if user_update.name is not None:
        db_user.name = user_update.name
    if user_update.organization_id is not None:
        db_user.organization_id = user_update.organization_id

    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.delete('/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(
        select(models.User).filter(models.User.id == user_id)
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found'
        )

    await db.delete(db_user)
    await db.commit()


@router.delete(
    '/by-telegram/{telegram_id}', status_code=status.HTTP_204_NO_CONTENT
)
async def delete_user_by_telegram_id(
    telegram_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(
        select(models.User).filter(models.User.telegram_id == telegram_id)
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found'
        )

    await db.delete(db_user)
    await db.commit()


@router.post('/login', response_model=schemas.UserResponse)
async def login_user(
    login_data: schemas.UserLogin, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.User).where(models.User.username == login_data.username)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(
        login_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid username or password',
        )
    return user


@router.get('/by-telegram/{telegram_id}', response_model=schemas.UserResponse)
async def get_user_by_telegramid(
    telegram_id: int, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.User).filter(models.User.telegram_id == telegram_id)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found'
        )
    return db_user


@router.post('/register', response_model=schemas.UserResponse)
async def register_user(
    user: schemas.UserCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.User).where(models.User.username == user.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Username already exists',
        )

    db_user = models.User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        name=user.name,
        organization_id=user.organization_id,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user
