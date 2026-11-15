import { CACHE_TTL_MS, limparCache } from './cache.js'
import {
  buscarAgregados,
  buscarInfoAgregado,
  buscarPibAnual,
  buscarValoresAgregado,
  completarPibAnual,
  converterNumero,
  obterDadosPibAnual,
} from './ibge.js'

export async function buscarSerie(agregadoId, variavelId, classificacao = null, opcoes = {}) {
  const resposta = await buscarValoresAgregado(agregadoId, variavelId, classificacao, opcoes)
  return resposta.serie
}

export async function buscarIndicador(indicador, opcoes = {}) {
  if (!indicador || typeof indicador !== 'object') {
    throw new Error('Configuração de indicador inválida.')
  }

  if (indicador.complementoTrimestral || indicador.id === 'pib') {
    const complemento = indicador.complementoTrimestral ?? {}
    const resposta = await obterDadosPibAnual({
      agregadoAnualId: indicador.agregadoId ?? 6784,
      variavelAnualId: indicador.variavelId ?? 9808,
      agregadoTrimestralId: complemento.agregadoId ?? 1846,
      variavelTrimestralId: complemento.variavelId ?? 585,
      classificacaoTrimestral: complemento.classificacao ?? '11255[90707]',
      periodosTrimestral: complemento.periodos ?? 'all',
      ...opcoes,
    })

    return {
      dados: resposta.serie,
      variavel: resposta.variavel,
      unidade: resposta.unidade,
    }
  }

  const resposta = await buscarValoresAgregado(
    indicador.agregadoId,
    indicador.variavelId,
    indicador.classificacao ?? null,
    opcoes
  )

  return {
    dados: resposta.serie,
    variavel: resposta.variavel,
    unidade: resposta.unidade,
  }
}

export {
  CACHE_TTL_MS,
  buscarAgregados,
  buscarInfoAgregado,
  buscarPibAnual,
  completarPibAnual,
  converterNumero,
  limparCache,
}
