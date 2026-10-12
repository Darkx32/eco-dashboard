# Bahia Economia — Modelagem de Dados

Entrega de Paulo Henrique. Comece por **docs/explicacao_para_apresentar.md** e abra **docs/der.png** para visualizar as relações.

## O que foi entregue

- `docs/modelagem.md`: modelo conceitual, lógico, físico e justificativas.
- `docs/dicionario.md`: todos os campos, tipos, chaves e regras.
- `docs/der.mmd`: DER editável; `der.svg`, `der.png` e `der.html`: visualização local.
- `docs/fontes_e_cobertura.md`: códigos, URLs, anos, unidades e lacuna de PIB per capita.
- `docs/integracao.md`: contrato para Python/FastAPI, SQLAlchemy/Psycopg e React.
- `sql/01_estrutura.sql` a `07_limpar_fixtures.sql`: estrutura, catálogos, dados reais, fixtures, consultas, testes e limpeza opcional.
- `evidencias/`: JSONs públicos consultados, hashes, URLs e relatório de validação. Logs específicos da máquina não são versionados.

Sete tabelas, duas views e dois índices adicionais. A chave da observação é município + indicador + ano + tipo. `v_dashboard` filtra apenas dados reais. Não há implementações completas de back-end ou front-end nesta entrega.

## Execução no Windows, PostgreSQL 18 / porta 5432

Abra um PowerShell interativo na raiz do repositório e execute:

```powershell
& '.\database\scripts\executar_windows.ps1'
```

Digite sua senha **somente no prompt oculto do psql**, sem salvá-la em arquivos. O executor conecta apenas em 127.0.0.1:5432, verifica a existência de `bahia_economia_teste_modelagem` e, se existir, sai sem modificá-lo. Se não existir, cria esse banco e executa 01–06. O usuário precisa ter permissão CREATEDB. Nenhuma conexão é feita em `bahia_economia` e nenhum DROP é executado. Não altere a política global do PowerShell; se ela bloquear scripts, use o pgAdmin abaixo.

O arquivo 01 é executado **uma única vez**, exige nome de banco iniciado por `bahia_economia_teste` e falha se o schema `economia` já existir. Essa proteção é intencional; implantação real exige revisão do responsável pelo banco. 02, 03 e 04 são repetíveis, preservam conflitos sem atualizar valores. 05 é somente leitura. 06 utiliza transação com ROLLBACK e depende de 02–04 num banco dedicado contendo o snapshot deste pacote. 07 remove exclusivamente o lote `fixture_modelagem_v1`, marcado como teste, e pode ser repetido.

## Execução no pgAdmin

1. Conecte ao servidor local já instalado, host 127.0.0.1, porta 5432. No Query Tool do banco `postgres`, execute `SELECT datname FROM pg_database ORDER BY datname;`.
2. Se `bahia_economia_teste_modelagem` não existir, crie-o pelo menu Databases → Create → Database ou rode `CREATE DATABASE bahia_economia_teste_modelagem;` isoladamente, sem BEGIN. Se existir, não o modifique: escolha outro nome exclusivo começando por `bahia_economia_teste_` e confira antes de criar.
3. Abra um novo Query Tool no banco recém-criado. Confira `SELECT current_database(), version();`.
4. Abra e execute, um por vez, os arquivos SQL 01, 02, 03 e 04; depois 05 e 06. Pare em qualquer erro. O arquivo `executar.psql` contém comandos exclusivos do psql e não deve ser aberto como SQL no pgAdmin.
5. O painel Messages de 06 deve mostrar os avisos PASSOU, sem ERROR. Veja as tabelas e views em Schemas → economia.
6. Opcionalmente execute 07. Para repetir 06 depois da limpeza, recarregue 04. Os 308 registros reais devem permanecer.

Nunca execute scripts em um banco de outro projeto. Para repetir uma carga parcialmente concluída, primeiro inspecione o estado: cada arquivo usa sua própria transação; 01 não deve ser repetido num schema existente.

## Validação realizada

A estrutura foi validada no PostgreSQL 18.6, Windows x86_64, primeiro em uma instância local isolada na porta 55439 e depois no banco existente `bahia_economia_teste_modelagem`, em `127.0.0.1:5432`, em 12/10/2026. A instalação no banco existente criou sete tabelas e duas views sem apagar ou recriar o banco. Foram carregados 417 municípios, 308 observações reais e quatro fixtures; os testes de integridade passaram.

O relatório está em `evidencias/resultado_validacao.md`. Logs locais e arquivos internos do PostgreSQL não integram o repositório. A instância isolada foi encerrada após os testes. Senhas não foram salvas nos arquivos.

## Limites e decisões pendentes

PIB per capita municipal não foi encontrado nas tabelas de agregados verificadas. A equipe deve decidir por uma fonte complementar oficial e validar seu esquema antes de ampliar o modelo. Os sete indicadores confirmados usam a tabela 5938; dados numéricos de PIB chegam a 2023, componentes em Guanambi chegam a 2021. Os anos 2022/2023 indisponíveis foram preservados como NULL com estado.

A importação futura, migrações, autenticação/permissões da aplicação, rotas finais e interface são trabalhos de integração da equipe. Os exemplos de integração não foram executados como aplicação FastAPI. O repositório contém a pasta `database` e as regras de exclusão; não inclui o cluster de testes nem credenciais.
