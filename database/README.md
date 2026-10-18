# Bahia Economia — Banco de Dados

Estrutura PostgreSQL para armazenar e consultar indicadores econômicos dos municípios da Bahia. Os dados são obtidos pela API de Agregados do IBGE e organizados por município, indicador e ano.

## Estrutura

O schema `economia` contém sete tabelas:

| Tabela | Finalidade |
|---|---|
| `municipio` | Códigos e nomes dos municípios baianos |
| `unidade` | Unidades de medida dos indicadores |
| `fonte` | Identificação da fonte dos dados |
| `indicador` | Indicadores e seus códigos no IBGE |
| `indicador_periodo` | Anos consultáveis por indicador |
| `coleta` | Origem, data e referência de cada coleta |
| `observacao` | Valores por município, indicador, ano e tipo de dado |

A view `v_dashboard` reúne os dados reais para consulta. A view `v_ultimo_disponivel` retorna o último ano com valor disponível para cada município e indicador.

Os registros fictícios usados nos testes ficam separados dos dados reais. Valores indisponíveis são armazenados como `NULL`, acompanhados do estado informado pela fonte.

## Documentação

- [Modelagem conceitual, lógica e física](docs/modelagem.md)
- [Dicionário de dados](docs/dicionario.md)
- [Diagrama de relacionamentos](docs/der.png)
- [Diagrama editável em Mermaid](docs/der.mmd)
- [Fontes, indicadores e cobertura](docs/fontes_e_cobertura.md)
- [Integração com o back-end](docs/integracao.md)
- [Relatório de testes](evidencias/resultado_validacao.md)

## Instalação

Requisitos: PostgreSQL 18 e acesso por pgAdmin ou psql. Os scripts utilizam um banco de testes cujo nome começa com `bahia_economia_teste`.

### PowerShell

Na raiz do repositório, execute:

```powershell
& '.\database\scripts\executar_windows.ps1'
```

O script está configurado para uma instalação local do PostgreSQL 18, no endereço `127.0.0.1`, porta `5432`, com o usuário `postgres`. O psql é localizado em `C:\Program Files\PostgreSQL\18\bin`. Ajuste essas configurações conforme o ambiente. A senha é solicitada durante a conexão e não fica armazenada no script.

O banco `bahia_economia_teste_modelagem` será criado se ainda não existir. O usuário precisa ter permissão `CREATEDB`. Se o banco já existir, o script encerra sem alterações; nesse caso, confira sua estrutura pelo pgAdmin antes de executar qualquer SQL.

### pgAdmin

1. Conecte ao servidor PostgreSQL local e confira os bancos existentes.
2. Para uma instalação nova, crie `bahia_economia_teste_modelagem` ou outro banco exclusivo com o prefixo `bahia_economia_teste_`.
3. Abra o **Query Tool** do banco escolhido e confirme a conexão com `SELECT current_database();`.
4. Execute os arquivos da pasta `sql` na ordem abaixo. Interrompa a sequência se ocorrer algum erro.

| Ordem | Arquivo | Função |
|---|---|---|
| 1 | `01_estrutura.sql` | Criar o schema, tabelas, restrições, índices e views |
| 2 | `02_catalogos.sql` | Cadastrar municípios, indicadores, unidades e períodos |
| 3 | `03_dados_reais.sql` | Carregar os dados consultados no IBGE |
| 4 | `04_fixtures_teste.sql` | Inserir registros fictícios para os testes |
| 5 | `05_consultas.sql` | Consultar séries históricas e comparar municípios |
| 6 | `06_testes.sql` | Verificar as regras de integridade |

Execute `01_estrutura.sql` apenas quando o schema `economia` ainda não existir. Os arquivos 02, 03 e 04 podem ser repetidos: registros já cadastrados são preservados, sem atualização dos valores.

O arquivo `07_limpar_fixtures.sql` é opcional e remove apenas o lote fictício `fixture_modelagem_v1`. Para executar os testes novamente após a limpeza, recarregue o arquivo 04.

Os arquivos `.psql` da pasta `scripts` são exclusivos do psql e não devem ser executados no Query Tool.

## Consulta de exemplo

Série histórica do PIB de Guanambi:

```sql
SELECT ano, valor, unidade, estado
FROM economia.v_dashboard
WHERE municipio_codigo = '2911709'
  AND indicador_codigo = 'pib'
ORDER BY ano;
```

As tabelas ficam em **Schemas → economia → Tables** e as views em **Schemas → economia → Views**.

## Testes

A estrutura foi validada no PostgreSQL 18.6 em 12/10/2026, com 417 municípios cadastrados, 308 observações do IBGE e quatro registros fictícios. Os testes verificam duplicidade, chaves estrangeiras, compatibilidade de unidade e fonte, tratamento de ausência e separação dos dados de teste.

O arquivo `06_testes.sql` executa as verificações em uma transação encerrada com `ROLLBACK`. Ele depende dos catálogos e dados dos arquivos 02, 03 e 04 em um banco dedicado a esta carga. As mensagens `PASSOU` indicam as verificações concluídas; qualquer erro deve ser investigado antes de continuar.

## Cobertura dos dados

Os sete indicadores cadastrados pertencem à tabela 5938 do IBGE. Para Guanambi, a série de PIB contém valores de 2002 a 2023. Os indicadores de impostos e valor adicionado consultados possuem valores até 2021; as ausências de 2022 e 2023 foram mantidas no banco.

As tabelas de agregados verificadas não oferecem PIB per capita no nível municipal. A inclusão desse indicador depende da definição de uma fonte oficial complementar e da validação de seus campos e metodologia.

A conexão com o back-end, as migrações e a rotina de atualização dos dados devem seguir as regras descritas em [integração](docs/integracao.md).
