import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.services.ibge import IBGEService, completar_pib_anual


class PibAnualTests(unittest.TestCase):
    def test_completa_2025_preserva_anuais_e_exclui_2026_parcial(self):
        anuais = {"2023": "10943345000000", "2024": "11779251000000"}
        trimestres = {
            "202404": "999",  # A série anual publicada tem prioridade.
            "202503": "3235708",
            "202501": "3024723",
            "202504": "3277790",
            "202502": "3200345",
            "202601": "3250979",
            "202602": "3425728",
        }
        resultado = completar_pib_anual(anuais, trimestres, 1_000_000)
        self.assertEqual(resultado["2025"], "12738566000000")
        self.assertEqual(resultado["2024"], anuais["2024"])
        self.assertNotIn("2026", resultado)
        self.assertNotIn("2025", anuais)
        self.assertEqual(list(resultado), ["2023", "2024", "2025"])

    def test_nao_completa_ano_com_valores_ausentes_ou_nao_finitos(self):
        for invalido in ("..", "...", "-", "NaN", "Infinity", None):
            with self.subTest(invalido=invalido):
                dados = {"202501": "1", "202502": "2", "202503": "3", "202504": invalido}
                self.assertEqual(completar_pib_anual({}, dados, 1_000_000), {})

    def test_futuro_ano_completo_e_precisao_decimal(self):
        dados = {f"20260{trimestre}": "0.1" for trimestre in range(1, 5)}
        self.assertEqual(completar_pib_anual({}, dados, 1_000_000), {"2026": "400000.0"})

    def test_rota_disponivel(self):
        resposta = {"variavel": "PIB", "unidade": "Reais", "resultados": [{"2025": "12738566000000"}]}
        with patch("app.routes.economy.ibge_service.get_pib_anual", new=AsyncMock(return_value=resposta)):
            with TestClient(app) as client:
                resultado = client.get("/economy/pib-anual")
        self.assertEqual(resultado.status_code, 200)
        self.assertEqual(resultado.json(), resposta)


class PibServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_consulta_categoria_pib_e_converte_milhoes_para_reais(self):
        anual = {"variavel": "PIB", "unidade": "Reais", "resultados": [{"2024": "11779251000000"}]}
        trimestral = [{
            "unidade": "Milhões de Reais",
            "resultados": [{"series": [{"serie": {f"20250{q}": "1" for q in range(1, 5)}}]}],
        }]
        chamadas = []

        def responder(request):
            chamadas.append(request)
            return httpx.Response(200, json=trimestral)

        cliente = httpx.AsyncClient(transport=httpx.MockTransport(responder))
        service = IBGEService()
        with patch.object(service, "get_value_from_agregado_variavel_id", new=AsyncMock(return_value=anual)) as consulta_anual:
            with patch("app.services.ibge.httpx.AsyncClient", return_value=cliente):
                resposta = await service.get_pib_anual()
        consulta_anual.assert_awaited_once_with(6784, 9808)
        self.assertEqual(chamadas[0].url.params["classificacao"], "11255[90707]")
        self.assertEqual(chamadas[0].url.params["localidades"], "BR")
        self.assertEqual(chamadas[0].url.path, "/api/v3/agregados/1846/periodos/all/variaveis/585")
        self.assertEqual(resposta["unidade"], "Reais")
        self.assertEqual(resposta["resultados"][0]["2025"], "4000000")


if __name__ == "__main__":
    unittest.main()
