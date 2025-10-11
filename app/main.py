from typing import Generator

from fastapi import FastAPI
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine

app = FastAPI()

Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
