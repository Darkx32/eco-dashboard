import { filtrarSerie, formatarPeriodo } from './dadosEconomia.js'

export function calcularRelatorio(dados, inicio = '', fim = '') {
  const registros = filtrarSerie(dados, inicio, fim)
  const validos = registros.filter(({ valor }) => Number.isFinite(valor))
  if (validos.length === 0) return null

  const inicial = validos[0]
  const final = validos.at(-1)
  const comparavel = validos.length > 1
  const diferenca = comparavel ? final.valor - inicial.valor : null
  const variacao = comparavel && inicial.valor !== 0
    ? (diferenca / Math.abs(inicial.valor)) * 100
    : null
  const menor = Math.min(...validos.map(({ valor }) => valor))
  const maior = Math.max(...validos.map(({ valor }) => valor))

  return {
    registros,
    inicial,
    final,
    comparavel,
    diferenca,
    variacao,
    menor: { valor: menor, periodos: validos.filter(({ valor }) => valor === menor).map(({ periodo }) => periodo) },
    maior: { valor: maior, periodos: validos.filter(({ valor }) => valor === maior).map(({ periodo }) => periodo) },
    indisponiveis: registros.length - validos.length,
  }
}

export function formatarValorRelatorio(valor, unidade) {
  if (!Number.isFinite(valor)) return 'Indisponível'
  const numero = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return unidade === 'R$' ? `R$ ${numero}` : `${numero}%`
}

export function formatarVariacaoRelatorio(relatorio, unidade) {
  const valor = unidade === '%' ? relatorio.diferenca : relatorio.variacao
  if (valor == null || !Number.isFinite(valor)) return 'Não calculável'
  // Arredondar antes do sinal evita exibir -0,00 para diferenças residuais.
  const numero = Number(valor.toFixed(2)).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  })
  return `${numero}${unidade === '%' ? ' p.p.' : '%'}`
}

export function gerarResumoRelatorio(indicador, relatorio) {
  const periodo = (p) => formatarPeriodo(p, indicador.frequencia)
  const valor = (v) => formatarValorRelatorio(v, indicador.unidade)
  const { inicial, final } = relatorio
  if (!relatorio.comparavel) {
    return `${indicador.nome}: ${valor(inicial.valor)} em ${periodo(inicial.periodo)}. Um registro no período selecionado.`
  }

  const comparacao = `${indicador.nome}: de ${valor(inicial.valor)} em ${periodo(inicial.periodo)} para ${valor(final.valor)} em ${periodo(final.periodo)}.`
  const diferenca = relatorio.diferenca
  if (diferenca === 0) return `${comparacao} Sem variação entre as duas referências.`
  if (indicador.unidade === 'R$' && relatorio.variacao == null) {
    return `${comparacao} Diferença nominal de ${valor(relatorio.diferenca)}; variação percentual não calculável com valor inicial zero.`
  }

  const movimento = diferenca > 0 ? 'Alta' : 'Queda'
  const medida = indicador.unidade === '%' ? relatorio.diferenca : relatorio.variacao
  const numero = Math.abs(medida).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const unidade = indicador.unidade === '%'
    ? Number(Math.abs(medida).toFixed(2)) === 1 ? ' ponto percentual' : ' pontos percentuais'
    : '%'
  return `${comparacao} ${movimento}${indicador.unidade === 'R$' ? ' nominal' : ''} de ${numero}${unidade}.`
}
