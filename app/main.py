from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.base import router as all_routers
from app.database import Base, engine

app = FastAPI(title='QR Access System')

Base.metadata.create_all(bind=engine)


app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(all_routers)


@app.get('/')
async def root() -> dict:
    return {'message': 'QR Access System API работает!'}
