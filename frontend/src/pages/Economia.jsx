import { useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { INDICADORES } from '../data/indicadores'
import { buscarIndicador, buscarSerie } from '../services/api'
import DadosEconomia from '../components/DadosEconomia'
import MunicipiosBahia from '../components/MunicipiosBahia'
import RelatoriosEconomia from '../components/RelatoriosEconomia'
import {
  calcularCrescimento,
  formatarMesAno,
  formatarMoeda,
  formatarNumero,
  formatarReferenciaIndicador,
  formatarTrimestre,
  formatarValorIndicador,
} from '../utils/dadosEconomia'
import './Economia.css'

const COR = 'var(--economia-destaque)'
const ABAS = ['Visão Geral', 'Indicadores', 'Municípios', 'Dados', 'Gráficos', 'Relatórios']
const EIXO = { fill: 'var(--economia-eixo)', fontSize: 12 }
const TOOLTIP = {
  backgroundColor: 'var(--economia-papel)',
  borderColor: 'var(--economia-grade)',
  color: 'var(--economia-tinta)',
  borderRadius: 0,
}
const SERIE_INICIAL = { dados: [], carregando: true, erro: null }
const PERIODOS_GRAFICO = [
  { id: '6m', rotulo: '6 meses', meses: 6, trimestres: 2, anos: 1 },
  { id: '1a', rotulo: '1 ano', meses: 12, trimestres: 4, anos: 1 },
  { id: '5a', rotulo: '5 anos', meses: 60, trimestres: 20, anos: 5 },
  { id: '10a', rotulo: '10 anos', meses: 120, trimestres: 40, anos: 10 },
  { id: 'tudo', rotulo: 'Tudo', meses: null, trimestres: null, anos: null },
]
const PERIODOS_ANUAIS = PERIODOS_GRAFICO.filter((opcao) => opcao.id !== '6m')
const LOCALIDADES_IPCA = [
  { id: 'BR', nome: 'Brasil' },
  { id: 'N7[3501]', nome: 'RM São Paulo (SP)' },
  { id: 'N7[3301]', nome: 'RM Rio de Janeiro (RJ)' },
  { id: 'N7[3101]', nome: 'RM Belo Horizonte (MG)' },
  { id: 'N7[2601]', nome: 'RM Recife (PE)' },
  { id: 'N7[2301]', nome: 'RM Fortaleza (CE)' },
  { id: 'N7[1501]', nome: 'RM Belém (PA)' },
  { id: 'N7[3201]', nome: 'RM Grande Vitória (ES)' },
  { id: 'N7[4101]', nome: 'RM Curitiba (PR)' },
  { id: 'N7[4301]', nome: 'RM Porto Alegre (RS)' },
  { id: 'N6[5300108]', nome: 'Brasília (DF)' },
  { id: 'N6[2800308]', nome: 'Aracaju (SE)' },
  { id: 'N6[2111300]', nome: 'São Luís (MA)' },
  { id: 'N6[5208707]', nome: 'Goiânia (GO)' },
  { id: 'N6[5002704]', nome: 'Campo Grande (MS)' },
  { id: 'N6[1200401]', nome: 'Rio Branco (AC)' },
]
const CORES_COMPARACAO = ['#2f6f5e', '#4b6b94', '#8b5e83', '#b57b2e', '#5a7d3a']

const intervalo = (serie) => {
  if (serie.length === 0) return ''
  if (serie.length === 1) return `, ${serie[0].periodo}`
  return `, ${serie[0].periodo} a ${serie.at(-1).periodo}`
}

function filtrarPorPeriodoGrafico(dados, periodoId, frequencia = null) {
  if (!Array.isArray(dados) || dados.length === 0 || periodoId === 'tudo') {
    return dados
  }

  const opcao = PERIODOS_GRAFICO.find(({ id }) => id === periodoId)
  if (!opcao || (!opcao.meses && !opcao.anos && !opcao.trimestres)) {
    return dados
  }

  if (frequencia === 'Trimestral') {
    return opcao.trimestres ? dados.slice(-opcao.trimestres) : dados
  }

  const ultimoPeriodo = String(dados.at(-1).periodo)
  const quantidade = ultimoPeriodo.length === 6 ? opcao.meses : opcao.anos
  return quantidade ? dados.slice(-quantidade) : dados
}

function criarEstadoInicial(listaIndicadores) {
  return Object.fromEntries(
    listaIndicadores.map(({ id }) => [id, { ...SERIE_INICIAL }])
  )
}

function useIndicadores(listaIndicadores) {
  const [series, setSeries] = useState(() => criarEstadoInicial(listaIndicadores))

  useEffect(() => {
    let ativo = true

    for (const indicador of listaIndicadores) {
      buscarIndicador(indicador)
        .then(({ dados }) => {
          if (!ativo) return
          setSeries((atual) => ({
            ...atual,
            [indicador.id]: { dados, carregando: false, erro: null },
          }))
        })
        .catch((erro) => {
          if (!ativo) return
          setSeries((atual) => ({
            ...atual,
            [indicador.id]: { dados: [], carregando: false, erro: erro.message },
          }))
        })
    }

    return () => {
      ativo = false
    }
  }, [listaIndicadores])

  return series
}

const statusDe = (s) => {
  if (s.carregando) return 'Carregando...'
  if (s.erro) return 'Não foi possível carregar os dados. Tente novamente em instantes.'
  if (s.dados.length === 0) return 'Sem dados disponíveis.'
  return null
}

function resumirSerieAcessivel(dados, { titulo, formatarPeriodo = String, formatarValor }) {
  if (!Array.isArray(dados) || dados.length === 0) return ''

  const inicial = dados[0]
  const final = dados.at(-1)
  let menor = inicial
  let maior = inicial

  for (const item of dados) {
    if (item.valor < menor.valor) menor = item
    if (item.valor > maior.valor) maior = item
  }

  return `Gráfico de ${titulo}. ${dados.length} ${dados.length === 1 ? 'registro' : 'registros'}, de ${formatarPeriodo(inicial.periodo)} (${formatarValor(inicial.valor)}) até ${formatarPeriodo(final.periodo)} (${formatarValor(final.valor)}). Menor valor: ${formatarValor(menor.valor)} em ${formatarPeriodo(menor.periodo)}. Maior valor: ${formatarValor(maior.valor)} em ${formatarPeriodo(maior.periodo)}.`
}

function Variacao({ valor }) {
  return (
    <span className={`economia-variacao ${valor >= 0 ? 'economia-variacao--alta' : 'economia-variacao--baixa'}`}>
      <span aria-hidden="true">{valor >= 0 ? '↑' : '↓'} </span>
      <span className="economia-sr-only">{valor >= 0 ? 'Alta de ' : 'Queda de '}</span>
      {formatarNumero(Math.abs(valor), 1)}%
    </span>
  )
}

function Kpi({ titulo, status, valor, detalhe, variacao }) {
  return (
    <article className="economia-kpi">
      <h2 className="economia-kpi-titulo">{titulo}</h2>
      {status ? (
        <p className="economia-status" role="status">{status}</p>
      ) : (
        <>
          <p className="economia-kpi-valor">{valor}</p>
          <p className="economia-kpi-detalhe">
            <span>{detalhe}</span>
            {variacao != null && (
              <span title="Variação em relação ao período anterior">
                <Variacao valor={variacao} />
              </span>
            )}
          </p>
        </>
      )}
    </article>
  )
}

function Grafico({
  titulo,
  subtitulo,
  status,
  resumoAcessivel,
  controlesExtras,
  opcoesPeriodo = PERIODOS_GRAFICO,
  periodoAtivo,
  aoMudarPeriodo,
  className = '',
  children,
}) {
  return (
    <section className={`economia-secao ${className}`}>
      <div className="economia-secao-cabecalho">
        <div>
          <h2 className="economia-secao-titulo">{titulo}</h2>
          <p className="economia-legenda">{subtitulo}</p>
        </div>
        {aoMudarPeriodo && (
          <div className="economia-periodos" role="group" aria-label={`Período de ${titulo}`}>
            {opcoesPeriodo.map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                aria-pressed={periodoAtivo === opcao.id}
                onClick={() => aoMudarPeriodo(opcao.id)}
                className={`economia-periodo-botao ${periodoAtivo === opcao.id ? 'economia-periodo-botao--ativo' : ''}`}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        )}
      </div>
      {controlesExtras}
      {!status && resumoAcessivel && (
        <p className="economia-sr-only">{resumoAcessivel}</p>
      )}
      <div className="economia-grafico">
        {status ? (
          <div className="economia-grafico-status" role="status">
            {status}
          </div>
        ) : (
          <div aria-hidden="true" style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}

function GraficoPib({ serie }) {
  const [periodoAtivo, setPeriodoAtivo] = useLocalStorage('eco-grafico-pib-ba-filtro', 'tudo')
  const dados = filtrarPorPeriodoGrafico(serie.dados, periodoAtivo)
  const resumo = resumirSerieAcessivel(dados, {
    titulo: 'PIB da Bahia',
    formatarValor: formatarMoeda,
  })

  return (
    <Grafico
      titulo="PIB da Bahia (R$ bilhões)"
      subtitulo={`Valores correntes${intervalo(dados)}`}
      status={statusDe(serie)}
      resumoAcessivel={resumo}
      opcoesPeriodo={PERIODOS_ANUAIS}
      periodoAtivo={periodoAtivo}
      aoMudarPeriodo={setPeriodoAtivo}
    >
      <BarChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} />
        <YAxis
          tick={EIXO}
          domain={[0, 'auto']}
          allowDecimals={false}
          tickFormatter={(v) => formatarNumero(v / 1e9, 0)}
        />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'var(--economia-realce)' }} formatter={(v) => [formatarMoeda(v), 'PIB da Bahia']} />
        <Bar dataKey="valor" fill={COR} maxBarSize={48} />
      </BarChart>
    </Grafico>
  )
}

function GraficoPibPerCapita({ serie, serieBrasil }) {
  const [periodoAtivo, setPeriodoAtivo] = useLocalStorage('eco-grafico-percapita-ba-filtro', 'tudo')
  const mapaBrasil = Object.fromEntries(
    (serieBrasil?.dados ?? []).map(({ periodo, valor }) => [String(periodo), valor])
  )
  const dadosBase = serie.dados.map(({ periodo, valor }) => ({
    periodo,
    bahia: valor,
    brasil: mapaBrasil[String(periodo)] ?? null,
  }))
  const dados = filtrarPorPeriodoGrafico(dadosBase, periodoAtivo)
  const resumoBahia = resumirSerieAcessivel(
    dados.map(({ periodo, bahia }) => ({ periodo, valor: bahia })),
    { titulo: 'PIB per capita da Bahia', formatarValor: formatarMoeda }
  )
  const resumoBrasil = resumirSerieAcessivel(
    dados
      .filter(({ brasil }) => brasil != null)
      .map(({ periodo, brasil }) => ({ periodo, valor: brasil })),
    { titulo: 'PIB per capita do Brasil', formatarValor: formatarMoeda }
  )

  return (
    <Grafico
      titulo="PIB per capita: Bahia vs Brasil (R$)"
      subtitulo={`Valores correntes · estimado para a Bahia${intervalo(dados)}`}
      status={statusDe(serie)}
      resumoAcessivel={[resumoBahia, resumoBrasil].filter(Boolean).join(' ')}
      opcoesPeriodo={PERIODOS_ANUAIS}
      periodoAtivo={periodoAtivo}
      aoMudarPeriodo={setPeriodoAtivo}
    >
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} />
        <YAxis tick={EIXO} width={70} domain={['auto', 'auto']} tickFormatter={(v) => formatarNumero(v, 0)} />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(v, nome) => [formatarMoeda(v), nome === 'bahia' ? 'Bahia' : 'Brasil']}
        />
        <Legend formatter={(valor) => (valor === 'bahia' ? 'Bahia' : 'Brasil')} />
        <Line type="monotone" dataKey="bahia" name="bahia" stroke={COR} strokeWidth={2.5} dot={dados.length <= 24} connectNulls />
        <Line type="monotone" dataKey="brasil" name="brasil" stroke="var(--economia-eixo)" strokeWidth={2} strokeDasharray="5 4" dot={dados.length <= 24} connectNulls />
      </LineChart>
    </Grafico>
  )
}

function GraficoIpca({ serie, className }) {
  const [periodoAtivo, setPeriodoAtivo] = useLocalStorage('eco-grafico-ipca-ssa-filtro', 'tudo')
  const [comparacoes, setComparacoes] = useLocalStorage('eco-ipca-comparacoes', [])
  const [seriesExtras, setSeriesExtras] = useState({})

  useEffect(() => {
    let ativo = true

    for (const localidadeId of comparacoes) {
      if (seriesExtras[localidadeId]) continue
      buscarSerie(7060, 2265, null, { localidades: localidadeId })
        .then((dados) => {
          if (!ativo) return
          setSeriesExtras((atual) => ({ ...atual, [localidadeId]: dados }))
        })
        .catch(() => {
          if (!ativo) return
          setSeriesExtras((atual) => ({ ...atual, [localidadeId]: [] }))
        })
    }

    return () => {
      ativo = false
    }
  }, [comparacoes, seriesExtras])

  const localidadesAtivas = comparacoes
    .map((id) => LOCALIDADES_IPCA.find((loc) => loc.id === id))
    .filter(Boolean)

  const mapasExtras = Object.fromEntries(
    localidadesAtivas.map((loc) => [
      loc.id,
      Object.fromEntries((seriesExtras[loc.id] ?? []).map(({ periodo, valor }) => [periodo, valor])),
    ])
  )

  const dadosCombinados = serie.dados.map(({ periodo, valor }) => {
    const ponto = { periodo, salvador: valor }
    for (const loc of localidadesAtivas) {
      ponto[loc.id] = mapasExtras[loc.id]?.[periodo] ?? null
    }
    return ponto
  })

  const dados = filtrarPorPeriodoGrafico(dadosCombinados, periodoAtivo)
  const periodo =
    dados.length > 0
      ? dados.length === 1
        ? ` · ${formatarMesAno(dados[0].periodo)}`
        : ` · ${formatarMesAno(dados[0].periodo)} a ${formatarMesAno(dados.at(-1).periodo)}`
      : ''

  const resumoSalvador = resumirSerieAcessivel(
    dados.map(({ periodo: p, salvador }) => ({ periodo: p, valor: salvador })),
    {
      titulo: 'IPCA da Região Metropolitana de Salvador acumulado em 12 meses',
      formatarPeriodo: formatarMesAno,
      formatarValor: (v) => `${formatarNumero(v)}%`,
    }
  )

  const disponiveis = LOCALIDADES_IPCA.filter((loc) => !comparacoes.includes(loc.id))

  const controlesComparacao = (
    <div className="economia-ipca-comparacoes">
      <span className="economia-ipca-chip economia-ipca-chip--base">RM Salvador</span>
      {localidadesAtivas.map((loc, indice) => (
        <button
          key={loc.id}
          type="button"
          className="economia-ipca-chip"
          style={{ borderColor: CORES_COMPARACAO[indice % CORES_COMPARACAO.length] }}
          onClick={() => setComparacoes((atual) => atual.filter((id) => id !== loc.id))}
          aria-label={`Remover comparação com ${loc.nome}`}
        >
          {loc.nome} <span aria-hidden="true">×</span>
        </button>
      ))}
      {disponiveis.length > 0 && (
        <select
          className="economia-ipca-select"
          aria-label="Adicionar localidade para comparar no IPCA"
          value=""
          onChange={(event) => {
            const escolhido = event.target.value
            if (!escolhido) return
            setComparacoes((atual) => (atual.includes(escolhido) ? atual : [...atual, escolhido]))
          }}
        >
          <option value="">+ Comparar localidade</option>
          {disponiveis.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.nome}
            </option>
          ))}
        </select>
      )}
    </div>
  )

  return (
    <Grafico
      titulo="IPCA – RM Salvador (%)"
      subtitulo={`Acumulado em 12 meses · Região Metropolitana de Salvador${periodo}`}
      status={statusDe(serie)}
      resumoAcessivel={resumoSalvador}
      controlesExtras={controlesComparacao}
      opcoesPeriodo={PERIODOS_GRAFICO}
      periodoAtivo={periodoAtivo}
      aoMudarPeriodo={setPeriodoAtivo}
      className={className}
    >
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickFormatter={formatarMesAno} minTickGap={24} />
        <YAxis tick={EIXO} width={55} tickFormatter={(v) => `${formatarNumero(v, 1)}%`} />
        <Tooltip
          contentStyle={TOOLTIP}
          labelFormatter={formatarMesAno}
          formatter={(v, nome) => [
            `${formatarNumero(v)}%`,
            nome === 'salvador'
              ? 'RM Salvador'
              : LOCALIDADES_IPCA.find((loc) => loc.id === nome)?.nome ?? nome,
          ]}
        />
        {localidadesAtivas.length > 0 && (
          <Legend
            formatter={(valor) =>
              valor === 'salvador'
                ? 'RM Salvador'
                : LOCALIDADES_IPCA.find((loc) => loc.id === valor)?.nome ?? valor
            }
          />
        )}
        <Line type="monotone" dataKey="salvador" name="salvador" stroke={COR} strokeWidth={2.5} dot={dados.length <= 24} connectNulls />
        {localidadesAtivas.map((loc, indice) => (
          <Line
            key={loc.id}
            type="monotone"
            dataKey={loc.id}
            name={loc.id}
            stroke={CORES_COMPARACAO[indice % CORES_COMPARACAO.length]}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={dados.length <= 24}
            connectNulls
          />
        ))}
      </LineChart>
    </Grafico>
  )
}

function GraficoDesemprego({ serie, className }) {
  const [periodoAtivo, setPeriodoAtivo] = useLocalStorage('eco-grafico-desemprego-ba-filtro', 'tudo')
  const dados = filtrarPorPeriodoGrafico(serie.dados, periodoAtivo, 'Trimestral')
  const periodo =
    dados.length > 0
      ? dados.length === 1
        ? ` · ${formatarTrimestre(dados[0].periodo)}`
        : ` · ${formatarTrimestre(dados[0].periodo)} a ${formatarTrimestre(dados.at(-1).periodo)}`
      : ''
  const resumo = resumirSerieAcessivel(dados, {
    titulo: 'Taxa de desemprego da Bahia',
    formatarPeriodo: formatarTrimestre,
    formatarValor: (v) => `${formatarNumero(v, 1)}%`,
  })

  return (
    <Grafico
      titulo="Taxa de desemprego – Bahia (%)"
      subtitulo={`Trimestral · pessoas de 14 anos ou mais na força de trabalho${periodo}`}
      status={statusDe(serie)}
      resumoAcessivel={resumo}
      opcoesPeriodo={PERIODOS_GRAFICO}
      periodoAtivo={periodoAtivo}
      aoMudarPeriodo={setPeriodoAtivo}
      className={className}
    >
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickFormatter={formatarTrimestre} minTickGap={24} />
        <YAxis tick={EIXO} width={55} domain={[0, 'auto']} tickFormatter={(v) => `${formatarNumero(v, 1)}%`} />
        <Tooltip contentStyle={TOOLTIP} labelFormatter={formatarTrimestre} formatter={(v) => [`${formatarNumero(v, 1)}%`, 'Desemprego (Bahia)']} />
        <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot={dados.length <= 24} />
      </LineChart>
    </Grafico>
  )
}

function TabelaIndicadores({ linhas }) {
  return (
    <section className="economia-secao economia-tabela-secao">
      <h2 className="economia-secao-titulo">Principais indicadores</h2>
      <p className="economia-legenda">Última referência disponível de cada série</p>
      <div className="economia-tabela-rolagem">
        <table className="economia-tabela">
          <caption className="economia-sr-only">Valores e períodos dos principais indicadores econômicos</caption>
          <thead>
            <tr>
              <th scope="col">Indicador</th>
              <th scope="col">Valor</th>
              <th scope="col">Referência</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.nome}>
                <th scope="row">{l.nome}</th>
                <td>{l.valor}</td>
                <td>{l.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function Economia({ hubTheme = null }) {
  const [temaEscuroLocal, setTemaEscuroLocal] = useLocalStorage('eco-tema-escuro', false)
  const [aba, setAba] = useLocalStorage('eco-aba-ativa', 'Visão Geral')
  const series = useIndicadores(INDICADORES)

  const emModoHub = hubTheme !== null
  const temaEscuro = emModoHub ? hubTheme === 'dark' : temaEscuroLocal

  useEffect(() => {
    document.documentElement.classList.toggle('bahia-hub', emModoHub)
    document.documentElement.classList.toggle('dark', temaEscuro)
  }, [emModoHub, temaEscuro])

  const { pib, perCapita, perCapitaBrasil, ipca, desemprego } = series
  const kpisDestaque = INDICADORES.filter((indicador) => indicador.destaqueKpi)

  const linhas = INDICADORES.map((indicador) => {
    const serie = series[indicador.id]
    const registroAtual = serie.dados.at(-1)

    return {
      nome: indicador.nomeTabela ?? indicador.nome,
      valor: registroAtual
        ? formatarValorIndicador(registroAtual.valor, indicador)
        : statusDe(serie),
      ref: registroAtual
        ? formatarReferenciaIndicador(registroAtual.periodo, indicador.frequencia)
        : '',
    }
  })

  return (
    <div
      className="economia"
      data-palette={emModoHub ? 'bahia-hub' : 'padrao'}
      data-theme={temaEscuro ? 'dark' : 'light'}
      data-print={aba === 'Relatórios' ? 'relatorio' : undefined}
    >
      <div className="economia-container">
        <header className="economia-cabecalho">
          <div className="economia-expediente">
            <span className="economia-marca">Eco<span aria-hidden="true"> / </span>Dashboard</span>
          </div>
          {!emModoHub && (
            <button
              type="button"
              aria-label={temaEscuro ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              onClick={() => setTemaEscuroLocal((atual) => !atual)}
              className="economia-tema"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {temaEscuro ? (
                  <>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                  </>
                ) : <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z" />}
              </svg>
              {temaEscuro ? 'Tema claro' : 'Tema escuro'}
            </button>
          )}
        </header>

        <nav className="economia-navegacao" aria-label="Seções de economia">
          <div role="tablist" aria-label="Indicadores econômicos" className="economia-abas">
            {ABAS.map((nome, indice) => (
              <button
                key={nome}
                type="button"
                role="tab"
                id={`economia-aba-${indice}`}
                aria-controls="economia-conteudo"
                aria-selected={aba === nome}
                tabIndex={aba === nome ? 0 : -1}
                onClick={() => setAba(nome)}
                onKeyDown={(event) => {
                  const destinos = {
                    ArrowRight: (indice + 1) % ABAS.length,
                    ArrowLeft: (indice + ABAS.length - 1) % ABAS.length,
                    Home: 0,
                    End: ABAS.length - 1,
                  }
                  const destino = destinos[event.key]
                  if (destino == null) return
                  event.preventDefault()
                  setAba(ABAS[destino])
                  document.getElementById(`economia-aba-${destino}`)?.focus()
                }}
                className={`economia-aba ${aba === nome ? 'economia-aba--ativa' : ''}`}
              >
                {nome}
              </button>
            ))}
          </div>
        </nav>

        <main
          id="economia-conteudo"
          role="tabpanel"
          aria-labelledby={`economia-aba-${ABAS.indexOf(aba)}`}
          tabIndex={0}
          className="economia-conteudo"
        >
          {aba === 'Visão Geral' && (
            <>
              <div className="economia-resumo">
                {kpisDestaque.map((indicador) => {
                  const serie = series[indicador.id]
                  const registroAtual = serie.dados.at(-1)
                  const referencia = registroAtual
                    ? formatarReferenciaIndicador(registroAtual.periodo, indicador.frequencia)
                    : ''
                  const detalhe = registroAtual
                    ? [referencia, indicador.detalheKpi].filter(Boolean).join(' · ')
                    : ''

                  return (
                    <Kpi
                      key={indicador.id}
                      titulo={indicador.nome}
                      status={statusDe(serie)}
                      valor={registroAtual && formatarValorIndicador(registroAtual.valor, indicador)}
                      detalhe={detalhe}
                      variacao={indicador.exibirVariacaoKpi ? calcularCrescimento(serie.dados) : null}
                    />
                  )
                })}
              </div>
              <div className="economia-grade economia-grade--panorama">
                <GraficoPib serie={pib} />
                <TabelaIndicadores linhas={linhas} />
              </div>
            </>
          )}

          {aba === 'Indicadores' && (
            <div className="economia-grade economia-grade--panorama">
              <div>
                <GraficoIpca serie={ipca} />
                <GraficoDesemprego serie={desemprego} />
              </div>
              <TabelaIndicadores linhas={linhas} />
            </div>
          )}

          {aba === 'Gráficos' && (
            <div className="economia-grade">
              <GraficoPib serie={pib} />
              <GraficoPibPerCapita serie={perCapita} serieBrasil={perCapitaBrasil} />
              <GraficoIpca serie={ipca} />
              <GraficoDesemprego serie={desemprego} />
            </div>
          )}

          {aba === 'Municípios' && <MunicipiosBahia />}

          {aba === 'Dados' && <DadosEconomia series={series} {...series} />}

          {aba === 'Relatórios' && <RelatoriosEconomia series={series} {...series} />}
        </main>

        <footer className="economia-rodape">
          <span>Eco / Dashboard</span>
          <p>Fonte: Instituto Brasileiro de Geografia e Estatística · IBGE (Bahia)</p>
        </footer>
      </div>
    </div>
  )
}
