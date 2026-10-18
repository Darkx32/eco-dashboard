-- Série histórica: valor preservado na unidade original (Mil Reais).
SELECT ano,valor,estado,unidade FROM economia.v_dashboard
WHERE municipio_codigo='2911709' AND indicador_codigo='pib' ORDER BY ano;
-- Comparação: mesmo indicador, mesmo ano, mesma unidade.
SELECT municipio,valor,unidade FROM economia.v_dashboard
WHERE municipio_codigo IN ('2911709','2927408') AND indicador_codigo='pib' AND ano=2023
ORDER BY valor DESC NULLS LAST;
-- Filtro de indicador/período; ausência permanece NULL.
SELECT municipio,indicador,ano,valor,estado,unidade FROM economia.v_dashboard
WHERE indicador_codigo='vab_agropecuaria' AND ano BETWEEN 2020 AND 2023 ORDER BY municipio,ano;
-- Card mostra o ano efetivamente disponível; não rotular um valor antigo como atual.
SELECT * FROM economia.v_ultimo_disponivel WHERE municipio_codigo='2911709';
-- Exclusivo de testes: variação esperada de 20%, jamais usar esta consulta no dashboard.
SELECT (b.valor/a.valor-1)*100 AS variacao_teste FROM economia.observacao a
JOIN economia.observacao b USING(municipio_codigo,indicador_codigo,tipo)
WHERE a.tipo='teste' AND a.coleta_codigo='fixture_modelagem_v1' AND b.coleta_codigo='fixture_modelagem_v1'
AND a.ano=2020 AND b.ano=2021 AND a.indicador_codigo='pib';
