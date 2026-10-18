BEGIN;
DO $$ BEGIN BEGIN INSERT INTO economia.observacao SELECT * FROM economia.observacao WHERE tipo='teste' LIMIT 1; RAISE EXCEPTION 'FALHOU: duplicidade'; EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASSOU: duplicidade'; END; END $$;
DO $$ BEGIN BEGIN UPDATE economia.observacao SET municipio_codigo='2999999' WHERE tipo='teste' AND municipio_codigo='2911709' AND indicador_codigo='pib' AND ano=2020; RAISE EXCEPTION 'FALHOU: municipio_inexistente'; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASSOU: municipio_inexistente'; END; END $$;
DO $$ BEGIN BEGIN UPDATE economia.observacao SET ano=2099 WHERE tipo='teste' AND municipio_codigo='2911709' AND indicador_codigo='pib' AND ano=2020; RAISE EXCEPTION 'FALHOU: periodo_nao_catalogado'; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASSOU: periodo_nao_catalogado'; END; END $$;
DO $$ BEGIN BEGIN UPDATE economia.observacao SET unidade_codigo='reais' WHERE tipo='teste'; RAISE EXCEPTION 'FALHOU: unidade_incompativel'; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASSOU: unidade_incompativel'; END; END $$;
DO $$ BEGIN BEGIN UPDATE economia.observacao SET fonte_codigo='outra' WHERE tipo='teste'; RAISE EXCEPTION 'FALHOU: origem_incompativel'; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASSOU: origem_incompativel'; END; END $$;
DO $$ BEGIN BEGIN INSERT INTO economia.observacao SELECT (SELECT codigo FROM economia.municipio WHERE codigo NOT IN ('2911709','2927408') ORDER BY codigo LIMIT 1),indicador_codigo,2019,'ibge',valor,estado,valor_original,unidade_codigo,fonte_codigo,coleta_codigo FROM economia.observacao WHERE tipo='teste' AND municipio_codigo='2911709' AND indicador_codigo='pib' AND ano=2020; RAISE EXCEPTION 'FALHOU: teste_como_ibge'; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASSOU: teste_como_ibge'; END; END $$;
DO $$ BEGIN BEGIN UPDATE economia.observacao SET valor=0 WHERE tipo='teste' AND estado='indisponivel'; RAISE EXCEPTION 'FALHOU: ausencia_com_zero'; EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASSOU: ausencia_com_zero'; END; END $$;
DO $$ BEGIN BEGIN UPDATE economia.observacao SET valor=NULL WHERE tipo='teste' AND estado='disponivel'; RAISE EXCEPTION 'FALHOU: disponivel_sem_valor'; EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASSOU: disponivel_sem_valor'; END; END $$;
DO $$ BEGIN
 IF (SELECT count(*) FROM economia.observacao WHERE tipo='teste') <> 4 THEN RAISE EXCEPTION 'Fixtures ausentes'; END IF;
 IF (SELECT count(*) FROM economia.v_dashboard) <> 308 THEN RAISE EXCEPTION 'Snapshot real inesperado'; END IF;
 IF EXISTS (SELECT 1 FROM economia.v_dashboard WHERE origem LIKE 'teste:%') THEN RAISE EXCEPTION 'Fixture vazou'; END IF;
 IF NOT EXISTS (SELECT 1 FROM economia.v_dashboard WHERE municipio_codigo='2911709' AND indicador_codigo='vab_agropecuaria' AND ano=2023 AND estado='indisponivel' AND valor IS NULL) THEN RAISE EXCEPTION 'Ausência não preservada'; END IF;
 IF NOT EXISTS (SELECT 1 FROM economia.v_ultimo_disponivel WHERE municipio_codigo='2911709' AND indicador_codigo='pib' AND ano=2023) THEN RAISE EXCEPTION 'Último PIB incorreto'; END IF;
 IF NOT EXISTS (SELECT 1 FROM economia.v_ultimo_disponivel WHERE municipio_codigo='2911709' AND indicador_codigo='vab_agropecuaria' AND ano=2021) THEN RAISE EXCEPTION 'Último VAB incorreto'; END IF;
 RAISE NOTICE 'PASSOU: fixtures, isolamento, 308 observações reais, ausência e último ano';
END $$;
ROLLBACK;
