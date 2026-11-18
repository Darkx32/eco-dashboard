import { CACHE_TTL_MS, limparCache } from './cache.js'
import {
  buscarAgregados,
  buscarInfoAgregado,
  buscarPibAnual,
  buscarPibMunicipiosBahia,
  buscarSerieMunicipioBahia,
  buscarValoresAgregado,
  completarPibAnual,
  converterNumero,
  obterDadosPibAnual,
  obterDadosPibPerCapitaBahia,
} from './ibge.js'

export async function buscarSerie(agregadoId, variavelId, classificacao = null, opcoes = {}) {
  const resposta = await buscarValoresAgregado(agregadoId, variavelId, classificacao, opcoes)
  return resposta.serie
}

export async function buscarIndicador(indicador, opcoes = {}) {
  if (!indicador || typeof indicador !== 'object') {
    throw new Error('Configuração de indicador inválida.')
  }

  if (indicador.calculo === 'pibPerCapitaBahia') {
    const resposta = await obterDadosPibPerCapitaBahia(opcoes)
    return {
      dados: resposta.serie,
      variavel: resposta.variavel,
      unidade: resposta.unidade,
    }
  }

  if (indicador.complementoTrimestral) {
    const complemento = indicador.complementoTrimestral
    const resposta = await obterDadosPibAnual({
      agregadoAnualId: indicador.agregadoId,
      variavelAnualId: indicador.variavelId,
      agregadoTrimestralId: complemento.agregadoId,
      variavelTrimestralId: complemento.variavelId,
      classificacaoTrimestral: complemento.classificacao,
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
    {
      localidades: indicador.localidade ?? 'BR',
      ...opcoes,
    }
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
  buscarPibMunicipiosBahia,
  buscarSerieMunicipioBahia,
  completarPibAnual,
  converterNumero,
  limparCache,
}
