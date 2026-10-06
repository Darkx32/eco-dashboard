from app.services.ibge import IBGEService
from fastapi import Query
from fastapi import FastAPI

app = FastAPI()
ibge_service = IBGEService()

@app.get("/agregados")
async def agregados(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)) -> dict:
    data = await ibge_service.get_agregados()

    return {
        "total": len(data),
        "limit": limit,
        "offset": offset,
        "data": data[offset:offset + limit]
    }