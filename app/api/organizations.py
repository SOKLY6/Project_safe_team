from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import organization as models
from app.schemas import organization as schemas

router = APIRouter(prefix='/organizations', tags=['Organizations'])


@router.get('/', response_model=list[schemas.OrganizationResponse])
def get_organizations_list(
    db: Session = Depends(get_db),
) -> list[schemas.OrganizationResponse]:
    organizations = db.query(models.Organization).all()
    return [
        schemas.OrganizationResponse(
            id=cast(int, org.id), name=cast(str, org.name)
        )
        for org in organizations
    ]


@router.get(
    '/{organization_id}',
    response_model=schemas.OrganizationResponse,
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

    return schemas.OrganizationResponse(
        id=cast(int, db_organization.id), name=cast(str, db_organization.name)
    )
