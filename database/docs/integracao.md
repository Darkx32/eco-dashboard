# Contrato de integração com a equipe

## Coleta / FastAPI

1. Consultar metadados e períodos antes de pedir valores. Usar IDs do catálogo, timeout e repetição limitada para falhas transitórias (429/5xx). Falha HTTP/JSON não é valor zero nem ausência estatística: abortar lote e registrar erro no back-end.
2. Validar município N6 da Bahia, variável, unidade, ano e classificações vazias. Guardar resposta bruta UTF-8 e hash SHA-256. Usar Decimal a partir de string.
3. Tratar símbolos conforme fontes_e_cobertura.md, validar todo o lote e só depois gravar em uma transação. Não manter transação aberta durante HTTP. Preservar estado/original e data de coleta distinta do ano econômico.
4. Repetir consulta idêntica não pode duplicar a chave. Atualizações reais exigem estratégia de revisão descrita em modelagem.md; os scripts SQL de entrega não sobrescrevem números.

## SQLAlchemy 2 / Psycopg 3

Dependências opcionais: `python -m pip install "sqlalchemy>=2,<3" "psycopg[binary]>=3,<4"`.
Usar URL.create('postgresql+psycopg', username=..., password=..., host='127.0.0.1', port=5432, database=...) com senha obtida por getpass ou cofre; nunca imprimir engine.url nem ativar echo com segredos. Não colocar credenciais em arquivo versionado.
Mapear numeric para Decimal, timestamptz para datetime com fuso, smallint para int e NULL para None. O DDL SQL é a referência; a equipe pode refletir tabelas com MetaData(schema='economia').reflect(bind=engine). Não executar create_all para simular migrações do pacote.

```python
from sqlalchemy import text
consulta = text("""SELECT ano, valor, estado, unidade, origem
FROM economia.v_dashboard
WHERE municipio_codigo=:municipio AND indicador_codigo=:indicador
  AND ano BETWEEN :inicio AND :fim ORDER BY ano""")
with engine.connect() as conn:
    linhas = conn.execute(consulta, dict(municipio='2911709',
        indicador='pib', inicio=2020, fim=2023)).mappings().all()
```

No Psycopg, usar placeholders `%s` e parâmetros separados; nunca interpolar texto do usuário no SQL. Inserções devem informar colunas explicitamente no código de produção.

## Endpoints sugeridos (contrato, não servidor implementado)

| Método / rota | Filtros / resposta |
|---|---|
| GET /economia/municipios | busca textual, limite e paginação; código/nome |
| GET /economia/indicadores | código, nome, unidade, agregado, variável, anos consultáveis |
| GET /economia/series | municipio, indicador, inicio, fim; linhas ordenadas por ano |
| GET /economia/comparacao | municipios, indicador, ano; mesma unidade |
| GET /economia/ultimo | municipio, indicador; último valor numérico com ano explícito |

Exemplo real preservado no snapshot: `{"municipio":"2911709","indicador":"pib","ano":2023,"valor":"2028013.000000","unidade":"Mil Reais","estado":"disponivel"}`.
Para indisponível: valor JSON null e estado indisponivel. Decimal serializado em string evita perda na transmissão; React converte para número apenas para desenhar, conservando string para exibição precisa. O endpoint final inclui origem e coletado_em retornados pela view.

Validar código municipal de 7 dígitos iniciado em 29, existência no catálogo, indicador permitido, início <= fim e máximo razoável de municípios (ex.: 20). Proposta: 422 para filtro inválido; 404 para código desconhecido; 200/lista vazia para intervalo ainda não carregado; 503 para dependência indisponível numa carga síncrona. Documentar exemplos no Swagger. Não expor parâmetro tipo=teste em endpoints públicos. Mostrar “Sem dado disponível” para NULL e ano/unidade nos cards. Não interpolar dados ausentes nos gráficos sem aviso.

## Decisões da equipe

Paulo entrega esquema e regras; responsável por coleta implementa HTTP/tratamento; responsável por dados implementa transações/endpoints; front-end implementa apresentação. Confirmar fonte complementar de PIB per capita, política de atualização, implantação, paginação e nomes finais das rotas. APIs do hub e telas completas não foram implementadas nesta parte de modelagem.
