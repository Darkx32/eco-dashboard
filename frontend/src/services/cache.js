export const CACHE_TTL_MS = 15 * 60 * 1000
export const CACHE_PREFIX = 'eco-api-cache:v1:'

const memoriaCache = new Map()
const requisicoesEmAndamento = new Map()

function obterStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage
    }
  } catch {
    return null
  }
  return null
}

function normalizarChave(chave) {
  const texto = String(chave)
  return texto.startsWith(CACHE_PREFIX) ? texto : `${CACHE_PREFIX}${texto}`
}

function entradaValida(entrada, agora) {
  return (
    entrada !== null &&
    typeof entrada === 'object' &&
    'dados' in entrada &&
    typeof entrada.expiraEm === 'number' &&
    agora < entrada.expiraEm
  )
}

function removerEntrada(chaveNormalizada) {
  memoriaCache.delete(chaveNormalizada)
  const storage = obterStorage()
  if (!storage) return
  try {
    storage.removeItem(chaveNormalizada)
  } catch {
    return
  }
}

function limparExpirados(agora = Date.now()) {
  for (const [chave, entrada] of memoriaCache.entries()) {
    if (!entradaValida(entrada, agora)) {
      memoriaCache.delete(chave)
    }
  }

  const storage = obterStorage()
  if (!storage) return

  try {
    const chavesParaRemover = []
    for (let i = 0; i < storage.length; i += 1) {
      const chave = storage.key(i)
      if (!chave || !chave.startsWith(CACHE_PREFIX)) continue
      try {
        const entrada = JSON.parse(storage.getItem(chave))
        if (!entradaValida(entrada, agora)) {
          chavesParaRemover.push(chave)
        }
      } catch {
        chavesParaRemover.push(chave)
      }
    }
    for (const chave of chavesParaRemover) {
      storage.removeItem(chave)
    }
  } catch {
    return
  }
}

function lerEntradaCache(chave, agora = Date.now()) {
  const chaveNormalizada = normalizarChave(chave)
  const emMemoria = memoriaCache.get(chaveNormalizada)

  if (emMemoria) {
    if (entradaValida(emMemoria, agora)) {
      return emMemoria
    }
    removerEntrada(chaveNormalizada)
  }

  const storage = obterStorage()
  if (!storage) return null

  try {
    const bruto = storage.getItem(chaveNormalizada)
    if (!bruto) return null
    const entrada = JSON.parse(bruto)
    if (!entradaValida(entrada, agora)) {
      removerEntrada(chaveNormalizada)
      return null
    }
    memoriaCache.set(chaveNormalizada, entrada)
    return entrada
  } catch {
    removerEntrada(chaveNormalizada)
    return null
  }
}

export function obterCache(chave, agora = Date.now()) {
  const entrada = lerEntradaCache(chave, agora)
  return entrada ? entrada.dados : null
}

export function salvarCache(chave, dados, ttlMs = CACHE_TTL_MS, agora = Date.now()) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    return null
  }

  const chaveNormalizada = normalizarChave(chave)
  const entrada = {
    dados,
    criadoEm: agora,
    expiraEm: agora + ttlMs,
  }

  memoriaCache.set(chaveNormalizada, entrada)

  const storage = obterStorage()
  if (storage) {
    const serializado = JSON.stringify(entrada)
    try {
      storage.setItem(chaveNormalizada, serializado)
    } catch {
      limparExpirados(agora)
      try {
        storage.setItem(chaveNormalizada, serializado)
      } catch {
        return entrada
      }
    }
  }

  return entrada
}

export async function comCache(
  chave,
  buscarFn,
  { ttlMs = CACHE_TTL_MS, forcarAtualizacao = false, agora } = {}
) {
  const chaveNormalizada = normalizarChave(chave)
  const instanteAtual = () => (typeof agora === 'number' ? agora : Date.now())

  if (!forcarAtualizacao) {
    const emCache = lerEntradaCache(chaveNormalizada, instanteAtual())
    if (emCache) {
      return emCache.dados
    }

    const pendente = requisicoesEmAndamento.get(chaveNormalizada)
    if (pendente) {
      return pendente
    }
  }

  const promessa = Promise.resolve()
    .then(() => buscarFn())
    .then((resultado) => {
      if (resultado !== undefined) {
        salvarCache(chaveNormalizada, resultado, ttlMs, instanteAtual())
      }
      return resultado
    })
    .finally(() => {
      if (requisicoesEmAndamento.get(chaveNormalizada) === promessa) {
        requisicoesEmAndamento.delete(chaveNormalizada)
      }
    })

  requisicoesEmAndamento.set(chaveNormalizada, promessa)
  return promessa
}

export function limparCache(prefixo = CACHE_PREFIX) {
  const corresponde = (chave) =>
    chave.startsWith(prefixo) || chave.startsWith(`${CACHE_PREFIX}${prefixo}`)

  for (const chave of [...memoriaCache.keys()]) {
    if (corresponde(chave)) {
      memoriaCache.delete(chave)
    }
  }

  for (const chave of [...requisicoesEmAndamento.keys()]) {
    if (corresponde(chave)) {
      requisicoesEmAndamento.delete(chave)
    }
  }

  const storage = obterStorage()
  if (!storage) return

  try {
    const chavesParaRemover = []
    for (let i = 0; i < storage.length; i += 1) {
      const chave = storage.key(i)
      if (chave && chave.startsWith(CACHE_PREFIX) && corresponde(chave)) {
        chavesParaRemover.push(chave)
      }
    }
    for (const chave of chavesParaRemover) {
      storage.removeItem(chave)
    }
  } catch {
    return
  }
}
