from app.routes import economy
from fastapi import APIRouter

api_router = APIRouter()

api_router.include_router(economy.router)