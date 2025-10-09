from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models, schemas

app = FastAPI()

# Создаем таблицы, если их нет
Base.metadata.create_all(bind=engine)


# Dependency для сессии
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Пример endpoint регистрации пользователя
@app.post("/register", response_model=schemas.UserResponse)
def register_user_api(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.telegram_id == user.telegram_id).first()
    if existing:
        return existing
    db_user = models.User(
        telegram_id=user.telegram_id,
        name=user.name,
        organization=user.organization
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# Пример endpoint получения организаций
@app.get("/organizations", response_model=list[schemas.Organization])
def get_organizations_api():
    return [
        {"id": 1, "name": "safe_team"},
        {"id": 2, "name": "dev_team"}
    ]
