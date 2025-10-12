from api import models, schemas
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.main import get_db

router = APIRouter(prefix='/organizations', tags=['Organizations'])


@router.get('/', response_model=list[schemas.Organization])
def get_organizations_api(
    db: Session = Depends(get_db),
) -> list[schemas.Organization]:
    return db.query(models.Organization).all()
