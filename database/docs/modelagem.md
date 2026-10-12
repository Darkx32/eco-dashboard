# Modelagem de Dados — Paulo Henrique

## Problema e escopo

O Bahia Economia precisa armazenar séries anuais municipais, filtrar município/indicador/ano e informar a origem de cada número. A API externa e os gráficos pertencem aos colegas; a entrega aqui é a estrutura de armazenamento, seus contratos, evidências e testes. O PDF A3 contextualiza cinco módulos, Guanambi como demonstração, uso de HTTP/JSON, filtros, tratamento de erros, Git e integração. Não exige uma tabela particular. O rótulo “Back-end (INEP)” na divisão recebida é inconsistente com a fonte econômica definida (IBGE); a equipe deve ajustar essa nomenclatura.

## Conceitual

Um município tem muitas observações; um indicador tem muitos anos consultáveis; uma unidade mede muitos indicadores; uma fonte publica muitos indicadores e coletas; uma coleta dá origem a muitas observações. Uma observação pertence exatamente a um município, indicador/ano, unidade compatível e coleta da mesma fonte. O ambiente lógico da observação é `ibge` ou `teste`.

O grão é **um município + um indicador + um ano + um tipo de dado**. Exemplo: PIB de Guanambi em 2023, do IBGE, constitui uma única observação. Indicadores são linhas do catálogo, não colunas “PIB2021”, “PIB2022”. Isso permite novos anos sem alterar a estrutura.

## Lógico e normalização

As PKs usam códigos naturais estáveis do IBGE ou identificadores textuais documentados. FKs impedem municípios não cadastrados, anos não catalogados e unidades/fontes incoerentes. `indicador_periodo` representa períodos consultáveis, não garantia de valor numérico. Cardinalidades 1:N estão no DER; cada lado pai aceita zero filhos, cada observação exige todos os pais.

Catálogos separados evitam repetir nome de município, indicador e unidade em cada linha. Atributos são atômicos (1FN) e os catálogos removem dependências parciais/transitivas (2FN/3FN). Há redundância controlada: observacao repete unidade/fonte e tipo da coleta para registrar explicitamente o contexto e aplicar FKs compostas. Portanto não se afirma que toda a estrutura física esteja estritamente em 3FN. Os pares UNIQUE nos pais permitem provar a compatibilidade no próprio PostgreSQL.

Não há tabela de usuários, gráficos ou endpoints: não fazem parte dos fatos econômicos. Ano é smallint, sem dimensão calendário artificial para uma frequência estritamente anual. Não há classificações na tabela 5938; uma futura fonte com categorias exige estender o grão antes de importar, para não colidir observações distintas.

## Físico e integridade

Schema `economia`. Código municipal varchar(7), limitado à Bahia (prefixo 29). `numeric(24,6)` evita imprecisão de float e aceita frações; valores negativos não são proibidos genericamente porque alguns componentes podem admitir sinais negativos. Datas de coleta usam timestamptz; ano de referência é outra informação. Chaves únicas impedem duplicidade. DELETE não usa CASCADE: remover catálogo referenciado falha.

Ausência recebe NULL e estado, nunca zero. A coleta registra URL, data, hash e caminho do JSON bruto, permitindo auditar os dados. Unidades fazem parte do contrato; não há conversão silenciosa. O índice parcial atende indicador/ano entre municípios reais; a PK atende série de um município. O segundo índice auxilia rastrear lotes.

`v_dashboard` publica apenas registros ligados a coletas reais. `v_ultimo_disponivel` seleciona o último ano numérico por município/indicador, que pode ser diferente entre indicadores. Uma consulta vazia significa “não carregado/não encontrado”; uma linha NULL/indisponivel significa ausência explicitamente informada pelo IBGE.

## Revisões e repetição segura

01 falha caso o schema exista; não mascara diferenças com CREATE IF NOT EXISTS. 02–04 são repetíveis por ON CONFLICT DO NOTHING: preservam os registros existentes e NÃO atualizam revisões. Snapshots brutos ficam versionados por hash. Para atualização futura, o back-end deve validar o lote completo, abrir transação, registrar coleta nova e substituir valor/estado/original/coleta da chave existente de forma explícita; reter JSON antigo. Não existe auditoria de todas as versões em tabelas neste MVP. Uma exigência de consulta por versão requer tabela de histórico/migração.

Catálogos não devem ser editados para mudar a unidade de séries já carregadas. Criar uma versão de indicador ou uma migração validada. A aplicação deve ler somente views; conceder SELECT nessas views a um usuário de leitura é tarefa de implantação. O pacote não altera usuários, privilégios globais, configurações ou bancos preexistentes.
