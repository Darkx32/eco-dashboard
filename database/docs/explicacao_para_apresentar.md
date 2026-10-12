# Visão geral da modelagem

## Objetivo da entrega

Desenvolver a modelagem de dados do Bahia Economia a partir das fontes oficiais do IBGE, com DER, scripts PostgreSQL, documentação e testes. A atividade A3 fornece os requisitos acadêmicos; esta entrega cobre a organização, o armazenamento e a integridade dos dados econômicos.

## Estrutura entregue

A estrutura armazena informações econômicas anuais dos municípios baianos. Ela separa município, indicador, unidade, fonte, períodos consultáveis, coleta e observação. A entrega inclui sete tabelas, duas views e scripts de teste. As respostas da API oficial foram preservadas para permitir a conferência da origem dos números.

## Como funciona, com um exemplo

“Guanambi teve PIB de 2.028.013 Mil Reais em 2023” vira uma observação. O código 2911709 identifica Guanambi; `pib` identifica a variável 37 da tabela 5938; 2023 é o ano de referência; o valor decimal e a unidade são guardados sem conversão silenciosa. A coleta aponta a URL consultada, a data e o hash do JSON. Esse exemplo é real no snapshot entregue. Em Reais seriam 2.028.013.000, mas o banco conserva a unidade publicada.

Não fazemos uma coluna para cada ano. Cada novo ano é uma nova linha, permitindo buscar séries históricas e comparar municípios usando a mesma estrutura.

## Justificativas das decisões

- **Município separado:** o nome não precisa ser repetido em todas as observações; o código oficial evita confundir cidades.
- **Indicador separado:** PIB, impostos e valor adicionado têm significado próprio. O catálogo informa tabela e variável corretas.
- **Unidade explícita:** Mil Reais não é a mesma escala que Reais. Guardar a unidade evita gráficos mil vezes maiores ou menores.
- **Ano catalogado:** o banco impede carregar um ano não reconhecido para o indicador, mas permite que um ano consultável tenha valor indisponível.
- **Decimal:** valores econômicos não devem sofrer a imprecisão binária típica de float.
- **Chaves e relacionamentos:** impedem registros duplicados e observações ligadas a códigos inexistentes ou fontes incompatíveis.
- **NULL e estado:** “não disponível” não significa zero. O front-end poderá mostrar uma mensagem em vez de um número falso.
- **Coleta e evidência:** permitem explicar de onde veio cada número e quando foi consultado.
- **Tipo teste separado:** demonstrações fictícias são úteis para validar o banco, mas ficam fora das views do dashboard.

## Três níveis de modelagem

Conceitual descreve as entidades e suas relações. Lógico define atributos, chaves e cardinalidades. Físico transforma isso em tabelas PostgreSQL, tipos, índices, constraints e views. O DER desenha as relações; o dicionário explica os campos; o SQL implementa as regras.

## O que encontrei na pesquisa

O PIB municipal está na tabela 5938, variável 37. A variável 543 significa impostos, não PIB per capita. A tabela 6784 contém PIB per capita nacional, portanto não deve ser usada como se fosse municipal. A decisão sobre fonte complementar para PIB per capita precisa ser alinhada com o grupo; uma modelagem correta não inventa dados para preencher uma lacuna.

Para Guanambi, o PIB tem números de 2002 a 2023; impostos e valores adicionados pesquisados têm números até 2021. A resposta da API contém `...` nos componentes em 2022/2023. Isso foi mantido como indisponibilidade.

## Integração com a equipe

O responsável pela coleta sabe quais códigos consultar e como interpretar os valores. O responsável pelo banco/back-end recebe o SQL e as regras de gravação. O responsável pelo React recebe o contrato de resposta com ano, unidade e estado, além das consultas que alimentam os gráficos. A modelagem estabelece as regras de organização e integridade utilizadas pelas demais camadas.

## Validação

A estrutura foi validada no PostgreSQL 18.6 com dados reais do IBGE e fixtures separadas. O relatório `../evidencias/resultado_validacao.md` descreve os testes executados, os resultados e as limitações da validação.
