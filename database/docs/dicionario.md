# Dicionário de dados
Todos os atributos são NOT NULL, exceto observacao.valor. Nenhuma PK é autogerada. Restrições completas estão em 01_estrutura.sql.

## municipio
| Campo | Tipo PostgreSQL | Regra / significado |
|---|---|---|
| codigo | varchar(7) | PK; 7 dígitos, prefixo 29 |
| nome | text | Nome oficial; não vazio |

## unidade
| Campo | Tipo PostgreSQL | Regra / significado |
|---|---|---|
| codigo | text | PK interna: mil_reais |
| nome | text | UNIQUE; rótulo oficial |

## fonte
| Campo | Tipo PostgreSQL | Regra / significado |
|---|---|---|
| codigo | text | PK interna |
| nome | text | Identificação do provedor/API |
| url_documentacao | text | HTTPS |

## indicador
| Campo | Tipo PostgreSQL | Regra / significado |
|---|---|---|
| codigo | text | PK interna: pib etc. |
| nome | text | Nome oficial |
| fonte_codigo | text | FK fonte |
| agregado | integer | Código positivo da tabela IBGE |
| variavel | integer | Código positivo da variável |
| unidade_codigo | text | FK unidade |
| periodicidade | text | DEFAULT anual; somente anual |
| nivel | text | DEFAULT N6; somente N6 |

## indicador_periodo
| Campo | Tipo PostgreSQL | Regra / significado |
|---|---|---|
| indicador_codigo | text | PK composta; FK indicador |
| ano | smallint | PK composta; 1900–2100; período consultável |

## coleta
| Campo | Tipo PostgreSQL | Regra / significado |
|---|---|---|
| codigo | text | PK do lote |
| fonte_codigo | text | FK fonte |
| tipo | text | ibge ou teste |
| url | text | URL exata real ou identificador teste: |
| coletado_em | timestamptz | Instante com fuso |
| sha256 | varchar(64) | Hash hexadecimal da resposta; zeros nas fixtures |
| arquivo_evidencia | text | Caminho relativo da resposta preservada |

## observacao
| Campo | Tipo PostgreSQL | Regra / significado |
|---|---|---|
| municipio_codigo | varchar(7) | PK composta; FK municipio |
| indicador_codigo | text | PK composta; FKs compostas |
| ano | smallint | PK composta; FK indicador_periodo |
| tipo | text | PK composta; FK coleta garante ibge/teste |
| valor | numeric(24,6) | Único campo NULL permitido; decimal na unidade original |
| estado | text | disponivel/indisponivel/nao_aplicavel/sigiloso/faixa |
| valor_original | text | String original, inclusive símbolos |
| unidade_codigo | text | FK composta com indicador |
| fonte_codigo | text | FKs compostas com indicador e coleta |
| coleta_codigo | text | FK composta com tipo/fonte |

## Unicidades compostas
indicador: (fonte_codigo, agregado, variavel), (codigo, unidade_codigo), (codigo, fonte_codigo). coleta: (codigo, tipo, fonte_codigo). observacao: PK (municipio_codigo, indicador_codigo, ano, tipo). As FKs não usam cascata.

## Views
v_dashboard: municipio_codigo, municipio, indicador_codigo, indicador, ano, valor, estado, valor_original, unidade, agregado, variavel, origem, coletado_em, sha256. v_ultimo_disponivel tem as mesmas colunas e filtra o último ano com número por par município/indicador.
