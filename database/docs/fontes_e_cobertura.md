# Pesquisa das fontes

Consulta: 2026-10-12T03:05:56.402612+00:00. Evidências JSON integrais e SHA-256 estão em `evidencias/manifesto.json`.
Metadados: https://servicodados.ibge.gov.br/api/v3/agregados/5938/metadados. Períodos: https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos.
Requisição efetivamente realizada: https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/2002-2023/variaveis/37%7C543%7C498%7C513%7C517%7C6575%7C525?localidades=N6%5B2911709,2927408%5D

Todos os indicadores abaixo são anuais, nível municipal N6, preços correntes, referência metodológica 2010. Os metadados do agregado listam 2002–2023. A cobertura numérica abaixo foi verificada para Guanambi, município 2911709; não promete disponibilidade em todos os municípios.

| Indicador | Agregado | Variável | Unidade original | Anos numéricos em Guanambi |
|---|---|---|---|---|
| pib | 5938 | 37 | Mil Reais | 2002–2023 |
| impostos | 5938 | 543 | Mil Reais | 2002–2021 |
| vab_total | 5938 | 498 | Mil Reais | 2002–2021 |
| vab_agropecuaria | 5938 | 513 | Mil Reais | 2002–2021 |
| vab_industria | 5938 | 517 | Mil Reais | 2002–2021 |
| vab_servicos | 5938 | 6575 | Mil Reais | 2002–2021 |
| vab_administracao | 5938 | 525 | Mil Reais | 2002–2021 |

Foram preservadas 308 observações reais: 2 municípios (Guanambi e Salvador), 7 indicadores e 22 anos, incluindo ausências. O catálogo territorial contém 417 municípios da Bahia, verificados pela API de Localidades. Catálogo territorial atual não prova existência municipal em todos os anos históricos.

## PIB per capita: lacuna explícita

Não existe variável de PIB per capita nos metadados consultados da tabela 5938. A variável 543 é impostos, não PIB per capita. A tabela 6784 tem a variável 9812, em Reais, anual 1996–2023, mas seu nível é apenas N1 (Brasil). A tabela 1193 tem 2363, anual 1996–2015, somente N1. A 1194 tem 2363, anual 2006–2013, N1/N2/N3; nenhuma delas oferece N6. Elas NÃO foram cadastradas como indicadores municipais.

O portal oficial publica base municipal 2010–2023 em planilha e notas sobre a edição 2022–2023:
https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/9088-produto-interno-bruto-dos-municipios.html
https://ftp.ibge.gov.br/Pib_Municipios/2022_2023/base/

Decisão pendente da equipe: admitir uma fonte complementar oficial para PIB per capita, validar seus campos e metodologia e criar migração, ou ajustar o escopo inicial. Não foi inventado código municipal nem calculado PIB per capita com uma população de metodologia diferente. O modelo entregue cobre os sete indicadores municipais confirmados. Não há observações fabricadas de PIB per capita.

## Símbolos e regras

Legenda oficial SIDRA: https://sidra.ibge.gov.br/tabela/6784 (Símbolos especiais).
`...` = indisponível; `..` = não aplicável; `X` = sigiloso: valor SQL NULL, estado próprio e símbolo original preservado. `-` = zero absoluto, portanto 0 disponível; `0` também é um valor, não ausência. Letras A–Z exceto X representam faixas: guardar NULL/estado faixa e o original; não adivinhar número. O snapshot só encontrou números e `...`. Símbolos desconhecidos devem interromper a importação para revisão.

PIB é nominal: aumento entre anos não equivale a crescimento real descontada a inflação. Mil Reais × 1.000 converte para Reais; a unidade no banco permanece a original. Não somar PIB com seus componentes, nem somar PIB per capita entre municípios.
