export async function buscarSerie(agregadoId, variavelId) {
  const resp = await fetch(
    `/economy/values?agregados_id=${agregadoId}&variavel_id=${variavelId}`
  )
  if (!resp.ok) throw new Error(`Erro ${resp.status} ao buscar dados`)

  const dados = await resp.json()
  const bloco = dados.resultados?.[0] ?? {}

  return Object.entries(bloco).map(([periodo, valor]) => ({
    periodo,
    valor: Number(valor),
  }))
}