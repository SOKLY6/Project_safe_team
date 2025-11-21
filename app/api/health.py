from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.database import get_db

router = APIRouter(prefix='/health', tags=['Health Check'])


@router.get('/scanner')
async def health_scanner():
    return {
        'status': 'healthy',
        'service': 'QR Scanner Verification',
        'timestamp': __import__('datetime').datetime.now().isoformat(),
    }


@router.get('/database')
async def health_database(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text('SELECT 1'))
        return {
            'status': 'healthy',
            'service': 'Database',
            'timestamp': __import__('datetime').datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f'Database connection failed: {str(e)}',
        ) from None
