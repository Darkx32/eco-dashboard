from app.routes.router import api_router
from fastapi import FastAPI

app = FastAPI(title="Eco dashboard API")

app.include_router(api_router)