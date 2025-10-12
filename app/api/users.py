from api import models, schemas
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.main import get_db

router = APIRouter(prefix='/users', tags=['Users'])


@router.post('/register', response_model=schemas.UserResponse)
def register_user_api(
    user: schemas.UserCreate, db: Session = Depends(get_db)
) -> schemas.UserResponse:
    existing = (
        db.query(models.User)
        .filter(models.User.telegram_id == user.telegram_id)
        .first()
    )
    if existing:
        return existing
    db_user = models.User(
        telegram_id=user.telegram_id,
        name=user.name,
        organization=user.organization,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
