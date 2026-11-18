import { CACHE_TTL_MS, comCache } from './cache.js'

export const IBGE_URL = 'https://servicodados.ibge.gov.br/api/v3/agregados'

export const UNIT_TRANSFORM = {
  '%': 'Percentual',
  Pessoas: 'Pessoa',
  Unidades: 'Unidade',
  'Mil Cruzeiros Novos [1966 a 1968], Mil Cruzeiros [1969, 1973 a 1974, 1976 a 1979, 1981 a 1984, 1990], Milhões de Cruzados [1988], Mil Cruzados Novos [1989], Milhões de Cruzeiros [1992], Milhões de Cruzeiros Reais [1993], Mil Reais [1994 a 1995]':
    'Cruzeiros',
}

export const UNIT_CURRENCY = {
  Reais: {
    type: 'Reais',
    symbol: 'R$',
    multiplier: 1,
  },
  'Mil Reais': {
    type: 'Reais',
    symbol: 'R$',
    multiplier: 1_000,
  },
  'Milhões de Reais': {
    type: 'Reais',
    symbol: 'R$',
    multiplier: 1_000_000,
  },
  'Bilhões de Reais': {
    type: 'Reais',
    symbol: 'R$',
    multiplier: 1_000_000_000,
  },
}

const MARCADORES_AUSENTES = new Set([
  '',
  '-',
  '..',
  '...',
  'x',
  'nan',
  'infinity',
  '-infinity',
  '+infinity',
])

export function converterNumero(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null
  }

  if (valor == null || typeof valor === 'boolean' || typeof valor === 'object') {
    return null
  }

  const texto = String(valor).trim()
  if (MARCADORES_AUSENTES.has(texto.toLowerCase())) {
    return null
  }

  const numero = Number(texto.replace(',', '.'))
  return Number.isFinite(numero) ? numero : null
}

export function normalizarUnidade(unidade) {
  if (!unidade || typeof unidade !== 'string') return unidade

  if (Object.hasOwn(UNIT_TRANSFORM, unidade)) {
    return UNIT_TRANSFORM[unidade]
  }

  if (/cruzeiros|cruzados/i.test(unidade)) {
    return 'Cruzeiros'
  }

  return unidade
}

export function obterConfiguracaoMoeda(unidade) {
  if (!unidade || typeof unidade !== 'string') return null

  if (Object.hasOwn(UNIT_CURRENCY, unidade)) {
    return UNIT_CURRENCY[unidade]
  }

  const normalizada = unidade.trim().toLowerCase()
  if (normalizada === 'reais') {
    return UNIT_CURRENCY.Reais
  }
  if (normalizada === 'mil reais') {
    return UNIT_CURRENCY['Mil Reais']
  }
  if (normalizada === 'milhões de reais' || normalizada === 'milhoes de reais') {
    return UNIT_CURRENCY['Milhões de Reais']
  }
  if (normalizada === 'bilhões de reais' || normalizada === 'bilhoes de reais') {
    return UNIT_CURRENCY['Bilhões de Reais']
  }

  return null
}

export function multiplicarComPrecisao(valor, multiplicador = 1) {
  const numero = converterNumero(valor)
  if (numero === null) return null
  return Number((numero * multiplicador).toPrecision(15))
}

export function completarPibAnual(anuais = {}, trimestrais = {}, multiplicador = 1) {
  const completos = { ...anuais }
  const anosExistentes = Object.keys(anuais)
  const ultimoAno = anosExistentes.length > 0 ? anosExistentes.reduce((a, b) => (a > b ? a : b)) : '0000'
  const porAno = {}

  for (const [periodo, valor] of Object.entries(trimestrais ?? {})) {
    if (periodo.length !== 6 || !/^\d{6}$/.test(periodo)) continue

    const ano = periodo.slice(0, 4)
    const trimestre = periodo.slice(4)
    if (ano <= ultimoAno || !['01', '02', '03', '04'].includes(trimestre)) continue

    const numero = converterNumero(valor)
    if (numero === null) continue

    if (!porAno[ano]) {
      porAno[ano] = {}
    }
    porAno[ano][trimestre] = numero
  }

  for (const [ano, trimestres] of Object.entries(porAno)) {
    if (
      Object.hasOwn(trimestres, '01') &&
      Object.hasOwn(trimestres, '02') &&
      Object.hasOwn(trimestres, '03') &&
      Object.hasOwn(trimestres, '04')
    ) {
      const soma = Number(
        (trimestres['01'] + trimestres['02'] + trimestres['03'] + trimestres['04']).toPrecision(15)
      )
      completos[ano] = multiplicarComPrecisao(soma, multiplicador)
    }
  }

  return Object.fromEntries(
    Object.keys(completos)
      .sort()
      .map((ano) => [ano, completos[ano]])
  )
}

export function extrairSerieLimpa(blocoResultados) {
  if (!blocoResultados || typeof blocoResultados !== 'object') {
    return []
  }

  return Object.entries(blocoResultados)
    .map(([periodo, valor]) => ({
      periodo,
      valor: converterNumero(valor),
    }))
    .filter((item) => item.valor !== null)
    .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)))
}

export function limparRespostaVariavel(dadosBrutos) {
  if (!Array.isArray(dadosBrutos) || dadosBrutos.length === 0) {
    throw new Error('O IBGE não retornou dados para essa consulta.')
  }

  const data = dadosBrutos[0]
  const unit = obterConfiguracaoMoeda(data.unidade)
  const resultados = []

  for (const resultado of data.resultados ?? []) {
    const novoResultado = {}

    for (const serie of resultado.series ?? []) {
      for (const [periodo, valorBruto] of Object.entries(serie.serie ?? {})) {
        const numero = converterNumero(valorBruto)
        if (numero === null) {
          novoResultado[periodo] = null
          continue
        }

        novoResultado[periodo] = unit
          ? multiplicarComPrecisao(numero, unit.multiplier)
          : numero
      }
    }

    resultados.push(novoResultado)
  }

  return {
    id: data.id,
    variavel: data.variavel,
    unidade: unit ? unit.type : data.unidade,
    unidadeOriginal: data.unidade,
    resultados,
    serie: extrairSerieLimpa(resultados[0] ?? {}),
  }
}

function omitirChaves(objeto, chaves) {
  const copia = { ...objeto }
  for (const chave of chaves) {
    delete copia[chave]
  }
  return copia
}

export function limparMetadadosAgregado(metadadosBrutos, classificacaoLimit = 20) {
  if (!metadadosBrutos || typeof metadadosBrutos !== 'object') {
    throw new Error('Metadados inválidos retornados pelo IBGE.')
  }

  const base = omitirChaves(metadadosBrutos, ['nivelTerritorial'])
  const variaveis = metadadosBrutos.variaveis ?? []
  const classificacoes = metadadosBrutos.classificacoes ?? []

  return {
    ...base,
    variaveis: variaveis.map((variavel) => ({
      ...omitirChaves(variavel, ['sumarizacao']),
      unidade: normalizarUnidade(variavel.unidade),
    })),
    classificacoes: classificacoes.map((classificacao) => {
      const categorias = classificacao.categorias ?? []
      return {
        ...omitirChaves(classificacao, ['sumarizacao']),
        categorias: Number.isFinite(classificacaoLimit)
          ? categorias.slice(0, classificacaoLimit)
          : [...categorias],
      }
    }),
  }
}

async function requisitarJsonIbge(url, fetchFn = globalThis.fetch) {
  const resposta = await fetchFn(url)
  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao buscar dados do IBGE`)
  }
  return resposta.json()
}

export async function buscarValoresAgregado(
  agregadoId,
  variavelId,
  classificacao = null,
  opcoes = {}
) {
  const {
    periodos = 'all',
    localidades = 'BR',
    ttlMs = CACHE_TTL_MS,
    forcarAtualizacao = false,
    fetchFn = globalThis.fetch,
    agora,
  } = opcoes

  const segmentoPeriodos = periodos ? `/periodos/${periodos}` : ''
  const params = new URLSearchParams({ localidades })
  if (classificacao) {
    params.set('classificacao', classificacao)
  }

  const url = `${IBGE_URL}/${agregadoId}${segmentoPeriodos}/variaveis/${variavelId}?${params.toString()}`
  const chaveCache = `ibge:valores:${agregadoId}:${variavelId}:${periodos ?? 'padrao'}:${localidades}:${classificacao ?? 'sem-classificacao'}`

  return comCache(
    chaveCache,
    async () => {
      const dadosBrutos = await requisitarJsonIbge(url, fetchFn)
      return limparRespostaVariavel(dadosBrutos)
    },
    { ttlMs, forcarAtualizacao, agora }
  )
}

export async function obterDadosPibAnual(opcoes = {}) {
  const {
    agregadoAnualId = 6784,
    variavelAnualId = 9808,
    agregadoTrimestralId = 1846,
    variavelTrimestralId = 585,
    classificacaoTrimestral = '11255[90707]',
    periodosTrimestral = 'all',
    ttlMs = CACHE_TTL_MS,
    forcarAtualizacao = false,
    fetchFn = globalThis.fetch,
    agora,
  } = opcoes

  const paramsTrimestral = new URLSearchParams({
    localidades: 'BR',
    classificacao: classificacaoTrimestral,
  })
  const urlTrimestral = `${IBGE_URL}/${agregadoTrimestralId}/periodos/${periodosTrimestral}/variaveis/${variavelTrimestralId}?${paramsTrimestral.toString()}`
  const chaveCache =
    agregadoAnualId === 6784 &&
    variavelAnualId === 9808 &&
    agregadoTrimestralId === 1846 &&
    variavelTrimestralId === 585 &&
    classificacaoTrimestral === '11255[90707]'
      ? 'ibge:pib-anual'
      : `ibge:pib-anual:${agregadoAnualId}:${variavelAnualId}:${agregadoTrimestralId}:${variavelTrimestralId}:${classificacaoTrimestral}`

  return comCache(
    chaveCache,
    async () => {
      const [anual, trimestralBruto] = await Promise.all([
        buscarValoresAgregado(agregadoAnualId, variavelAnualId, null, {
          ttlMs,
          forcarAtualizacao,
          fetchFn,
          agora,
        }),
        requisitarJsonIbge(urlTrimestral, fetchFn),
      ])

      if (!Array.isArray(trimestralBruto) || trimestralBruto.length === 0) {
        throw new Error('O IBGE não retornou dados trimestrais do PIB.')
      }

      const trimestral = trimestralBruto[0]
      const unidade = obterConfiguracaoMoeda(trimestral.unidade)
      const valoresTrimestrais = trimestral.resultados?.[0]?.series?.[0]?.serie ?? {}
      const completos = completarPibAnual(
        anual.resultados?.[0] ?? {},
        valoresTrimestrais,
        unidade ? unidade.multiplier : 1
      )

      return {
        ...anual,
        resultados: [completos],
        serie: extrairSerieLimpa(completos),
      }
    },
    { ttlMs, forcarAtualizacao, agora }
  )
}

function obterPopulacaoParaAno(ano, anosDisponiveis, popPorAno) {
  if (Object.hasOwn(popPorAno, ano)) {
    return popPorAno[ano]
  }

  const anoNum = Number(ano)
  let anterior = null
  let proximo = null

  for (const candidato of anosDisponiveis) {
    if (candidato < anoNum) {
      anterior = candidato
    } else if (candidato > anoNum) {
      proximo = candidato
      break
    }
  }

  if (anterior !== null && proximo !== null) {
    const pAnt = popPorAno[String(anterior)]
    const pProx = popPorAno[String(proximo)]
    return pAnt + ((anoNum - anterior) / (proximo - anterior)) * (pProx - pAnt)
  }

  if (anterior !== null) return popPorAno[String(anterior)]
  if (proximo !== null) return popPorAno[String(proximo)]
  return null
}

export async function obterDadosPibPerCapitaBahia(opcoes = {}) {
  const {
    ttlMs = CACHE_TTL_MS,
    forcarAtualizacao = false,
    fetchFn = globalThis.fetch,
    agora,
  } = opcoes

  return comCache(
    'ibge:pib-per-capita-bahia',
    async () => {
      const [pibBahia, popBahia] = await Promise.all([
        buscarValoresAgregado(5938, 37, null, {
          localidades: 'N3[29]',
          ttlMs,
          forcarAtualizacao,
          fetchFn,
          agora,
        }),
        buscarValoresAgregado(6579, 9324, null, {
          localidades: 'N3[29]',
          ttlMs,
          forcarAtualizacao,
          fetchFn,
          agora,
        }),
      ])

      const popPorAno = Object.fromEntries(
        popBahia.serie.map(({ periodo, valor }) => [String(periodo), valor])
      )
      const anosDisponiveis = popBahia.serie
        .map(({ periodo }) => Number(periodo))
        .filter(Number.isFinite)
        .sort((a, b) => a - b)

      const serie = pibBahia.serie
        .map(({ periodo, valor }) => {
          const populacao = obterPopulacaoParaAno(periodo, anosDisponiveis, popPorAno)
          if (!populacao || populacao <= 0) return null
          return {
            periodo,
            valor: Number((valor / populacao).toFixed(2)),
          }
        })
        .filter(Boolean)

      return {
        id: 'perCapitaBahia',
        variavel: 'PIB per capita da Bahia (estimado)',
        unidade: 'Reais',
        serie,
      }
    },
    { ttlMs, forcarAtualizacao, agora }
  )
}

export async function buscarPibMunicipiosBahia(opcoes = {}) {
  const {
    ttlMs = CACHE_TTL_MS,
    forcarAtualizacao = false,
    fetchFn = globalThis.fetch,
    agora,
  } = opcoes

  const url = `${IBGE_URL}/5938/periodos/last%201/variaveis/37?localidades=N6[N3[29]]`

  return comCache(
    'ibge:municipios-bahia:pib-atual',
    async () => {
      const dadosBrutos = await requisitarJsonIbge(url, fetchFn)
      if (!Array.isArray(dadosBrutos) || dadosBrutos.length === 0) {
        throw new Error('O IBGE não retornou dados municipais da Bahia.')
      }

      const bloco = dadosBrutos[0]
      const unit = obterConfiguracaoMoeda(bloco.unidade)
      const multiplicador = unit ? unit.multiplier : 1
      const series = bloco.resultados?.[0]?.series ?? []

      const lista = series
        .map((item) => {
          const entradas = Object.entries(item.serie ?? {})
          if (entradas.length === 0) return null
          const [periodo, valorBruto] = entradas[0]
          const numero = converterNumero(valorBruto)
          if (numero === null) return null

          return {
            id: String(item.localidade.id),
            nome: String(item.localidade.nome).replace(/\s*-\s*BA$/i, ''),
            periodo,
            valor: multiplicarComPrecisao(numero, multiplicador),
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.valor - a.valor)

      const total = lista.reduce((soma, item) => soma + item.valor, 0)
      const periodo = lista[0]?.periodo ?? ''

      const municipios = lista.map((item, indice) => ({
        ...item,
        posicao: indice + 1,
        participacao: total > 0 ? (item.valor / total) * 100 : 0,
      }))

      return { periodo, total, municipios }
    },
    { ttlMs, forcarAtualizacao, agora }
  )
}

export async function buscarSerieMunicipioBahia(municipioId, opcoes = {}) {
  const {
    ttlMs = CACHE_TTL_MS,
    forcarAtualizacao = false,
    fetchFn = globalThis.fetch,
    agora,
  } = opcoes

  const idLimpo = String(municipioId)

  return comCache(
    `ibge:municipio-bahia:${idLimpo}`,
    async () => {
      const [pib, pop] = await Promise.all([
        buscarValoresAgregado(5938, 37, null, {
          localidades: `N6[${idLimpo}]`,
          ttlMs,
          forcarAtualizacao,
          fetchFn,
          agora,
        }),
        buscarValoresAgregado(6579, 9324, null, {
          localidades: `N6[${idLimpo}]`,
          ttlMs,
          forcarAtualizacao,
          fetchFn,
          agora,
        }),
      ])

      const popPorAno = Object.fromEntries(
        pop.serie.map(({ periodo, valor }) => [String(periodo), valor])
      )
      const anosDisponiveis = pop.serie
        .map(({ periodo }) => Number(periodo))
        .filter(Number.isFinite)
        .sort((a, b) => a - b)

      const perCapita = pib.serie
        .map(({ periodo, valor }) => {
          const populacao = obterPopulacaoParaAno(periodo, anosDisponiveis, popPorAno)
          if (!populacao || populacao <= 0) return null
          return {
            periodo,
            valor: Number((valor / populacao).toFixed(2)),
          }
        })
        .filter(Boolean)

      return {
        id: idLimpo,
        pib: pib.serie,
        perCapita,
      }
    },
    { ttlMs, forcarAtualizacao, agora }
  )
}

export async function buscarPibAnual(opcoes = {}) {
  const dados = await obterDadosPibAnual(opcoes)
  return dados.serie
}

export async function buscarAgregados({
  limit = 20,
  offset = 0,
  ttlMs = CACHE_TTL_MS,
  forcarAtualizacao = false,
  fetchFn = globalThis.fetch,
  agora,
} = {}) {
  const lista = await comCache(
    'ibge:agregados',
    () => requisitarJsonIbge(IBGE_URL, fetchFn),
    { ttlMs, forcarAtualizacao, agora }
  )

  return {
    total: lista.length,
    limit,
    offset,
    data: lista.slice(offset, offset + limit),
  }
}

export async function buscarInfoAgregado(
  id,
  {
    limit = 20,
    offset = 0,
    ttlMs = CACHE_TTL_MS,
    forcarAtualizacao = false,
    fetchFn = globalThis.fetch,
    agora,
  } = {}
) {
  const limpo = await comCache(
    `ibge:metadados:${id}:${limit}`,
    async () => {
      const metadados = await requisitarJsonIbge(`${IBGE_URL}/${id}/metadados`, fetchFn)
      return limparMetadadosAgregado(metadados, limit)
    },
    { ttlMs, forcarAtualizacao, agora }
  )

  const header = {
    id: limpo.id,
    nome: limpo.nome,
    pesquisa: limpo.pesquisa,
    assunto: limpo.assunto,
    periodicidade: limpo.periodicidade,
  }

  return {
    limit,
    offset,
    header,
    variaveis: (limpo.variaveis ?? []).slice(offset, offset + limit),
    classificacoes: (limpo.classificacoes ?? []).slice(offset, offset + limit),
  }
}
