-- Executar UMA VEZ em banco de teste dedicado e vazio. Falha se o schema existir.
BEGIN;
DO $$ BEGIN
 IF current_database() NOT LIKE 'bahia_economia_teste%' THEN
  RAISE EXCEPTION 'Use um banco exclusivo bahia_economia_teste...';
 END IF;
END $$;
CREATE SCHEMA economia;
CREATE TABLE economia.municipio (
 codigo varchar(7) PRIMARY KEY CHECK (codigo ~ '^29[0-9]{5}$'),
 nome text NOT NULL CHECK (btrim(nome) <> '')
);
CREATE TABLE economia.unidade (
 codigo text PRIMARY KEY,
 nome text NOT NULL UNIQUE
);
CREATE TABLE economia.fonte (
 codigo text PRIMARY KEY,
 nome text NOT NULL,
 url_documentacao text NOT NULL CHECK (url_documentacao LIKE 'https://%')
);
CREATE TABLE economia.indicador (
 codigo text PRIMARY KEY,
 nome text NOT NULL,
 fonte_codigo text NOT NULL REFERENCES economia.fonte,
 agregado integer NOT NULL CHECK (agregado > 0),
 variavel integer NOT NULL CHECK (variavel > 0),
 unidade_codigo text NOT NULL REFERENCES economia.unidade,
 periodicidade text NOT NULL DEFAULT 'anual' CHECK (periodicidade='anual'),
 nivel text NOT NULL DEFAULT 'N6' CHECK (nivel='N6'),
 UNIQUE(fonte_codigo, agregado, variavel),
 UNIQUE(codigo, unidade_codigo),
 UNIQUE(codigo, fonte_codigo)
);
CREATE TABLE economia.indicador_periodo (
 indicador_codigo text NOT NULL REFERENCES economia.indicador,
 ano smallint NOT NULL CHECK (ano BETWEEN 1900 AND 2100),
 PRIMARY KEY(indicador_codigo, ano)
);
CREATE TABLE economia.coleta (
 codigo text PRIMARY KEY,
 fonte_codigo text NOT NULL REFERENCES economia.fonte,
 tipo text NOT NULL CHECK (tipo IN ('ibge','teste')),
 url text NOT NULL,
 coletado_em timestamptz NOT NULL,
 sha256 varchar(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
 arquivo_evidencia text NOT NULL,
 CHECK ((tipo='ibge' AND url LIKE 'https://servicodados.ibge.gov.br/%')
     OR (tipo='teste' AND url LIKE 'teste:%')),
 UNIQUE(codigo, tipo, fonte_codigo)
);
CREATE TABLE economia.observacao (
 municipio_codigo varchar(7) NOT NULL REFERENCES economia.municipio,
 indicador_codigo text NOT NULL,
 ano smallint NOT NULL,
 tipo text NOT NULL,
 valor numeric(24,6),
 estado text NOT NULL CHECK (estado IN ('disponivel','indisponivel','nao_aplicavel','sigiloso','faixa')),
 valor_original text NOT NULL,
 unidade_codigo text NOT NULL,
 fonte_codigo text NOT NULL,
 coleta_codigo text NOT NULL,
 PRIMARY KEY(municipio_codigo, indicador_codigo, ano, tipo),
 FOREIGN KEY(indicador_codigo,ano) REFERENCES economia.indicador_periodo,
 FOREIGN KEY(indicador_codigo,unidade_codigo) REFERENCES economia.indicador(codigo,unidade_codigo),
 FOREIGN KEY(indicador_codigo,fonte_codigo) REFERENCES economia.indicador(codigo,fonte_codigo),
 FOREIGN KEY(coleta_codigo,tipo,fonte_codigo) REFERENCES economia.coleta(codigo,tipo,fonte_codigo),
 CHECK ((estado='disponivel' AND valor IS NOT NULL) OR (estado<>'disponivel' AND valor IS NULL))
);
CREATE INDEX observacao_filtro ON economia.observacao(indicador_codigo,ano,municipio_codigo) WHERE tipo='ibge';
CREATE INDEX observacao_coleta ON economia.observacao(coleta_codigo,tipo,fonte_codigo);
CREATE VIEW economia.v_dashboard AS
 SELECT o.municipio_codigo,m.nome AS municipio,o.indicador_codigo,i.nome AS indicador,
 o.ano,o.valor,o.estado,o.valor_original,u.nome AS unidade,i.agregado,i.variavel,
 c.url AS origem,c.coletado_em,c.sha256
 FROM economia.observacao o
 JOIN economia.municipio m ON m.codigo=o.municipio_codigo
 JOIN economia.indicador i ON i.codigo=o.indicador_codigo
 JOIN economia.unidade u ON u.codigo=o.unidade_codigo
 JOIN economia.coleta c ON c.codigo=o.coleta_codigo
 WHERE o.tipo='ibge' AND c.tipo='ibge';
CREATE VIEW economia.v_ultimo_disponivel AS
 SELECT DISTINCT ON (municipio_codigo,indicador_codigo) * FROM economia.v_dashboard
 WHERE estado='disponivel'
 ORDER BY municipio_codigo,indicador_codigo,ano DESC;
COMMIT;
