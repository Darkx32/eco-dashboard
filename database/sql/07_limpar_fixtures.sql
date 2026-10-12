-- Opcional e repetível. Remove somente o lote fictício criado por este pacote.
BEGIN;
DELETE FROM economia.observacao WHERE tipo='teste' AND coleta_codigo='fixture_modelagem_v1';
DELETE FROM economia.coleta WHERE tipo='teste' AND codigo='fixture_modelagem_v1';
COMMIT;
