from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import user as models
from app.schemas import user as schemas

router = APIRouter(prefix='/users', tags=['Users'])


@router.post('/post', response_model=schemas.UserResponse)
def register_user(
    user: schemas.UserCreate, db: Session = Depends(get_db)
) -> schemas.UserResponse:
    existing = (
        db.query(models.User)
        .filter(models.User.telegram_id == user.telegram_id)
        .first()
    )

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
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get('/by-id/{user_id}', response_model=schemas.UserResponse)
def get_user_by_id(
    user_id: int, db: Session = Depends(get_db)
) -> schemas.UserResponse:
    db_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found'
        )

    return db_user


@router.get('/by-telegram/{telegram_id}', response_model=schemas.UserResponse)
def get_user_by_telegram_id(
    telegram_id: int, db: Session = Depends(get_db)
) -> schemas.UserResponse:
    db_user = (
        db.query(models.User)
        .filter(models.User.telegram_id == telegram_id)
        .first()
    )

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='User not found'
        )

    return db_user
