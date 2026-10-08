import httpx

UNIT_TRANSFORM = {"%": "Percentual", "Pessoas": "Pessoa", "Unidades": "Unidade",
    "Mil Cruzeiros Novos [1966 a 1968], Mil Cruzeiros [1969, 1973 a 1974, 1976 a 1979, 1981 a 1984, 1990], Milhões de Cruzados [1988], Mil Cruzados Novos [1989], Milhões de Cruzeiros [1992], Milhões de Cruzeiros Reais [1993], Mil Reais [1994 a 1995]": "Cruzeiros"}

UNIT_CURRENCY = {
    "Reais": {
        "type": "Reais",
        "symbol": "R$",
        "multiplier": 1,
    },
    "Mil Reais": {
        "type": "Reais",
        "symbol": "R$",
        "multiplier": 1_000,
    },
    "Milhões de Reais": {
        "type": "Reais",
        "symbol": "R$",
        "multiplier": 1_000_000,
    },
}

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

    async def get_value_from_agregado_variavel_id(self, agregado_id: int, variavel_id: int) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.IBGE_URL}/{agregado_id}/variaveis/{variavel_id}?localidades=BR")
        response.raise_for_status()

        data = response.json()[0]
        unit = {}
        if data["unidade"] in UNIT_CURRENCY:
            unit = UNIT_CURRENCY[data["unidade"]]

        resultados = []
        if bool(unit):
            for resultado in data["resultados"]:
                new_resultado = {}
                for serie in resultado["series"]:
                    for key, value in serie["serie"].items():
                        new_resultado[key] = str(float(value) * unit["multiplier"])
                resultados.append(new_resultado)
        else:
            for resultado in data["resultados"]:
                new_resultado = {}
                for serie in resultado["series"]:
                    for key, value in serie["serie"].items():
                        new_resultado[key] = value
                resultados.append(new_resultado)
                

        if bool(unit):
            return {
                "variavel": data["variavel"],
                "unidade": unit["type"],
                "resultados": resultados
            }
        return {
                "variavel": data["variavel"],
                "unidade": data["unidade"],
                "resultados": resultados
            }