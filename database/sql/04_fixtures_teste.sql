BEGIN;
INSERT INTO economia.coleta VALUES ('fixture_modelagem_v1','ibge_agregados','teste','teste:fixture_modelagem_v1','2026-10-12T00:00:00Z',repeat('0',64),'sql/04_fixtures_teste.sql') ON CONFLICT DO NOTHING;
-- Valores deliberadamente fictícios: não representam a economia desses municípios.
INSERT INTO economia.observacao VALUES
 ('2911709','pib',2020,'teste',100,'disponivel','100','mil_reais','ibge_agregados','fixture_modelagem_v1'),
 ('2911709','pib',2021,'teste',120,'disponivel','120','mil_reais','ibge_agregados','fixture_modelagem_v1'),
 ('2927408','pib',2021,'teste',200,'disponivel','200','mil_reais','ibge_agregados','fixture_modelagem_v1'),
 ('2911709','vab_agropecuaria',2022,'teste',NULL,'indisponivel','...','mil_reais','ibge_agregados','fixture_modelagem_v1')
ON CONFLICT DO NOTHING;
COMMIT;
