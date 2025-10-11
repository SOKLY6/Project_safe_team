import models
import schemas
from fastapi import Depends
from sqlalchemy.orm import Session

from app.main import app, get_db


@app.get('/organizations', response_model=list[schemas.Organization])
def get_organizations_api(
    db: Session = Depends(get_db),
) -> list[schemas.Organization]:
    organizations = db.query(models.Organization).all()
    return organizations
