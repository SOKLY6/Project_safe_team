from app.models import organization as models
from app.schemas import organization as schemas
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix='/organizations', tags=['Organizations'])


@router.get('/', response_model=list[schemas.OrganizationResponse])
def get_organizations_list(
    db: Session = Depends(get_db),
) -> list[schemas.OrganizationResponse]:
    return db.query(models.Organization).all()


@router.get(
    '/{organization_id}',
    response_model=list[schemas.OrganizationResponse],
)
def get_organization_by_id(
    organization_id: int,
    db: Session = Depends(get_db),
) -> schemas.OrganizationResponse:
    db_organization = (
        db.query(models.Organization)
        .filter(models.Organization.id == organization_id)
        .first()
    )

    if not db_organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Organization not found',
        )

    return db_organization
