import httpx

class IBGEService:
    def __init__(self):
        self.IBGE_URL = "https://servicodados.ibge.gov.br/api/v3/agregados"
    
    async def get_agregados(self) -> list[dict]:
        async with httpx.AsyncClient() as client:
            response = await client.get(self.IBGE_URL)
        response.raise_for_status()

        return response.json()