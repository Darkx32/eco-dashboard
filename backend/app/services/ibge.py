import httpx

UNIT_TRANSFORM = {"%":"Porcentagem", "Pessoas":"Pessoa", "Unidades": "Unidade",
    "Mil Cruzeiros Novos [1966 a 1968], Mil Cruzeiros [1969, 1973 a 1974, 1976 a 1979, 1981 a 1984, 1990], Milhões de Cruzados [1988], Mil Cruzados Novos [1989], Milhões de Cruzeiros [1992], Milhões de Cruzeiros Reais [1993], Mil Reais [1994 a 1995]": "Cruzeiros"}

class IBGEService:
    def __init__(self):
        self.IBGE_URL = "https://servicodados.ibge.gov.br/api/v3/agregados"
    
    async def get_agregados(self) -> list[dict]:
        async with httpx.AsyncClient() as client:
            response = await client.get(self.IBGE_URL)
        response.raise_for_status()

        return response.json()

    async def get_info_agregado_by_id(self, id: int, classificacao_limit: int = 20) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.IBGE_URL}/{id}/metadados")
        response.raise_for_status()

        data = response.json()
        del data["nivelTerritorial"]

        for variavel in data["variaveis"]:
            try: 
                variavel["unidade"] = UNIT_TRANSFORM[variavel["unidade"]] 
            except:
                print(f"Value not found on transform {variavel["unidade"]}")
            del variavel["sumarizacao"]

        for classificacao in data["classificacoes"]:
            classificacao["categorias"] = classificacao["categorias"][:classificacao_limit]
            del classificacao["sumarizacao"]

        return data