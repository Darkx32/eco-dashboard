from fastapi import Query
from app.services.ibge import IBGEService
from fastapi import APIRouter

ibge_service = IBGEService()
router = APIRouter(
    prefix="/economy",
    tags=["Economy"],
)

@router.get("/")
async def agregados(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)) -> dict:
    data = await ibge_service.get_agregados()

    return {
        "total": len(data),
        "limit": limit,
        "offset": offset,
        "data": data[offset:offset + limit]
    }

@router.get("/info/{id}")
async def info(id: int, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    data = await ibge_service.get_info_agregado_by_id(id)

    header = {key: data[key] for key in ["id", "nome", "pesquisa", "assunto", "periodicidade"]}

    return {
        "limit": limit,
        "offset": offset,
        "header": header,
        "variaveis": data["variaveis"][offset:offset + limit],
        "classificacoes": data["classificacoes"][offset:offset + limit]
    }