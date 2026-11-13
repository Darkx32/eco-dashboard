async function obterSerie(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Erro ${resp.status} ao buscar dados`)

  const dados = await resp.json()
  const bloco = dados.resultados?.[0] ?? {}

  return Object.entries(bloco).map(([periodo, valor]) => ({
    periodo,
    valor: Number(valor),
  }))
}

export function buscarSerie(agregadoId, variavelId) {
  return obterSerie(`/economy/values?agregados_id=${agregadoId}&variavel_id=${variavelId}`)
}

export function buscarPibAnual() {
  return obterSerie('/economy/pib-anual')
}
