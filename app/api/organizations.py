from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import organization as models
from app.schemas import organization as schemas

router = APIRouter(prefix='/organizations', tags=['Organizations'])


@router.get('/', response_model=list[schemas.OrganizationResponse])
async def get_organizations_list(
    db: AsyncSession = Depends(get_db),
) -> list[schemas.OrganizationResponse]:
    result = await db.execute(select(models.Organization))
    organizations = result.scalars().all()
    return [
        schemas.OrganizationResponse(
            id=cast(int, org.id), name=cast(str, org.name)
        )
        for org in organizations
    ]


@router.post('/', response_model=schemas.OrganizationResponse)
async def create_organization(
    organization: schemas.OrganizationCreate,
    db: AsyncSession = Depends(get_db),
) -> schemas.OrganizationResponse:
    result = await db.execute(
        select(models.Organization).filter(
            models.Organization.name == organization.name
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Organization with this name already exists',
        )

    db_organization = models.Organization(name=organization.name)
    db.add(db_organization)
    await db.commit()
    await db.refresh(db_organization)
    return db_organization


@router.get('/{organization_id}', response_model=schemas.OrganizationResponse)
async def get_organization_by_id(
    organization_id: int,
    db: AsyncSession = Depends(get_db),
) -> schemas.OrganizationResponse:
    result = await db.execute(
        select(models.Organization).filter(
            models.Organization.id == organization_id
        )
    )
    db_organization = result.scalar_one_or_none()

    if not db_organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Organization not found',
        )

    return schemas.OrganizationResponse(
        id=cast(int, db_organization.id), name=cast(str, db_organization.name)
    )


@router.put('/{organization_id}', response_model=schemas.OrganizationResponse)
async def update_organization(
    organization_id: int,
    organization_update: schemas.OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
) -> schemas.OrganizationResponse:
    result = await db.execute(
        select(models.Organization).filter(
            models.Organization.id == organization_id
        )
    )
    db_organization = result.scalar_one_or_none()

    if not db_organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Organization not found',
        )

    if organization_update.name is not None:
        result = await db.execute(
            select(models.Organization).filter(
                models.Organization.name == organization_update.name
            )
        )
        existing = result.scalar_one_or_none()
        if existing and existing.id != organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Organization with this name already exists',
            )
        db_organization.name = organization_update.name

    await db.commit()
    await db.refresh(db_organization)
    return db_organization


@router.delete('/{organization_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    organization_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(
        select(models.Organization).filter(
            models.Organization.id == organization_id
        )
    )
    db_organization = result.scalar_one_or_none()

    if not db_organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Organization not found',
        )

    await db.delete(db_organization)
    await db.commit()
