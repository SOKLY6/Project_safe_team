from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import user as models
from app.schemas import user as schemas
from app.utils.database import get_db

router = APIRouter(prefix='/users', tags=['Users'])


@router.post('/post', response_model=schemas.UserResponse)
async def register_user(
    user: schemas.UserCreate, db: AsyncSession = Depends(get_db)
) -> schemas.UserResponse:
    result = await db.execute(
        select(models.User).filter(models.User.telegram_id == user.telegram_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='User with this telegram_id already exists',
        )

    db_user = models.User(
        telegram_id=user.telegram_id,
        name=user.name,
        organization_id=user.organization_id,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


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


@router.get('/by-telegram/{telegram_id}', response_model=schemas.UserResponse)
async def get_user_by_telegram_id(
    telegram_id: int, db: AsyncSession = Depends(get_db)
) -> schemas.UserResponse:
    result = await db.execute(
        select(models.User).filter(models.User.telegram_id == telegram_id)
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
) -> schemas.UserResponse:
    result = await db.execute(
        select(models.User).filter(models.User.id == user_id)
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
