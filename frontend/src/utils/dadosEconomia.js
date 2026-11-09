export function filtrarSerie(dados, inicio = '', fim = '') {
  return dados
    .filter(({ periodo }) => (!inicio || String(periodo) >= inicio) && (!fim || String(periodo) <= fim))
    .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)))
}

export function formatarTrimestreMovel(periodo) {
  const codigo = String(periodo)
  const anoFinal = Number(codigo.slice(0, 4))
  const mesFinal = Number(codigo.slice(4, 6)) - 1
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const mesInicial = (mesFinal + 10) % 12
  const inicio = mesFinal < 2 ? `${meses[mesInicial]}/${anoFinal - 1}` : meses[mesInicial]
  return `${inicio}–${meses[mesFinal]}/${anoFinal}`
}

export function formatarPeriodo(periodo, frequencia) {
  if (frequencia === 'Trimestre móvel') return formatarTrimestreMovel(periodo)
  const codigo = String(periodo)
  return codigo.length === 6 ? `${codigo.slice(4, 6)}/${codigo.slice(0, 4)}` : codigo
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

  // BOM, ponto e vírgula e vírgula decimal facilitam a abertura no Excel em português.
  return '\uFEFF' + linhas
    .map((linha) => linha.map((celula) => `"${String(celula).replaceAll('"', '""')}"`).join(';'))
    .join('\r\n')
}
