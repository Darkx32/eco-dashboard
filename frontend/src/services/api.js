
function converterNumero(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null
  }

  if (valor == null) return null

  const texto = String(valor).trim()

  
  if (['', '-', '..', '...', 'x'].includes(texto.toLowerCase())) {
    return null
  }

  const numero = Number(texto.replace(',', '.'))

  return Number.isFinite(numero) ? numero : null
}

async function obterSerie(url) {
  const resp = await fetch(url)

  if (!resp.ok) {
    throw new Error(`Erro ${resp.status} ao buscar dados`)
  }

  const dados = await resp.json()
  const bloco = dados.resultados?.[0]

  if (!bloco || typeof bloco !== 'object') {
    throw new Error('Formato de resposta inesperado da API')
  }

  const serie = Object.entries(bloco)
    .map(([periodo, valor]) => ({
      periodo,
      valor: converterNumero(valor),
    }))
    .filter((item) => item.valor !== null)

  if (serie.length === 0) {
    console.warn('Nenhum valor numérico encontrado:', dados)
  }

  return serie
}


export function buscarSerie(agregadoId, variavelId, classificacao) {
  const params = new URLSearchParams({
    agregados_id: agregadoId,
    variavel_id: variavelId,
  })

  if (classificacao) {
    params.set('classificacao', classificacao)
  }

  return obterSerie(`/economy/values?${params.toString()}`)
}

export function buscarPibAnual() {
  return obterSerie('/economy/pib-anual')
}
