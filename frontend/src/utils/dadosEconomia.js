const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function filtrarSerie(dados, inicio = '', fim = '') {
  return dados
    .filter(({ periodo }) => (!inicio || String(periodo) >= inicio) && (!fim || String(periodo) <= fim))
    .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)))
}

export function formatarNumero(n, casas = 2) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function formatarMoeda(n, casas = 0) {
  return `R$ ${formatarNumero(n, casas)}`
}

export function formatarTrilhoes(n, casas = 1) {
  return `R$ ${formatarNumero(n / 1e12, casas)} tri`
}

export function formatarMesAno(periodo) {
  const codigo = String(periodo ?? '')
  if (codigo.length !== 6) return codigo
  const mes = MESES[Number(codigo.slice(4, 6)) - 1]
  return mes ? `${mes}/${codigo.slice(2, 4)}` : codigo
}

export function formatarTrimestreMovel(periodo) {
  const codigo = String(periodo)
  const anoFinal = Number(codigo.slice(0, 4))
  const mesFinal = Number(codigo.slice(4, 6)) - 1
  const mesInicial = (mesFinal + 10) % 12
  const inicio = mesFinal < 2 ? `${MESES[mesInicial]}/${anoFinal - 1}` : MESES[mesInicial]
  return `${inicio}–${MESES[mesFinal]}/${anoFinal}`
}

export function formatarPeriodo(periodo, frequencia) {
  if (frequencia === 'Trimestre móvel') return formatarTrimestreMovel(periodo)
  const codigo = String(periodo)
  return codigo.length === 6 ? `${codigo.slice(4, 6)}/${codigo.slice(0, 4)}` : codigo
}

export function formatarReferenciaIndicador(periodo, frequencia) {
  if (periodo == null || periodo === '') return ''
  if (frequencia === 'Anual') return String(periodo)
  if (frequencia === 'Trimestre móvel') return formatarTrimestreMovel(periodo)
  if (frequencia === 'Mensal') return formatarMesAno(periodo)
  return formatarPeriodo(periodo, frequencia)
}

export function formatarValorIndicador(valor, indicador = {}) {
  if (!Number.isFinite(valor)) return 'Indisponível'

  const formato = indicador.formato
  if (formato === 'trilhoes') {
    return formatarTrilhoes(valor, indicador.casasDecimais ?? 1)
  }
  if (formato === 'moeda') {
    return formatarMoeda(valor, indicador.casasDecimais ?? 0)
  }
  if (formato === 'percentual') {
    return `${formatarNumero(valor, indicador.casasDecimais ?? 2)}%`
  }
  if (formato === 'indice') {
    return formatarNumero(valor, indicador.casasDecimais ?? 2)
  }

  if (indicador.unidade === 'R$') {
    return formatarMoeda(valor, indicador.casasDecimais ?? 2)
  }
  if (indicador.unidade === '%') {
    return `${formatarNumero(valor, indicador.casasDecimais ?? 2)}%`
  }
  return formatarNumero(valor, indicador.casasDecimais ?? 2)
}

export function calcularCrescimento(serie) {
  if (!Array.isArray(serie) || serie.length < 2) return null
  const [anterior, atual] = serie.slice(-2)
  if (!Number.isFinite(anterior?.valor) || !Number.isFinite(atual?.valor) || anterior.valor === 0) {
    return null
  }
  return (atual.valor / anterior.valor - 1) * 100
}

export function gerarCsv(indicador, dados) {
  const linhas = [
    ['Indicador', 'Período', 'Valor', 'Unidade', 'Fonte'],
    ...dados.map(({ periodo, valor }) => [
      indicador.nome,
      formatarPeriodo(periodo, indicador.frequencia),
      Number.isFinite(valor) ? String(valor).replace('.', ',') : '',
      indicador.unidade,
      'IBGE',
    ]),
  ]

  return '\uFEFF' + linhas
    .map((linha) => linha.map((celula) => `"${String(celula).replaceAll('"', '""')}"`).join(';'))
    .join('\r\n')
}
