import { useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { INDICADORES } from '../data/indicadores'
import { buscarIndicador } from '../services/api'
import DadosEconomia from '../components/DadosEconomia'
import RelatoriosEconomia from '../components/RelatoriosEconomia'
import {
  calcularCrescimento,
  formatarMesAno,
  formatarMoeda,
  formatarNumero,
  formatarReferenciaIndicador,
  formatarTrimestreMovel,
  formatarValorIndicador,
} from '../utils/dadosEconomia'
import './Economia.css'

const COR = 'var(--economia-destaque)'
const ABAS = ['Visão Geral', 'Indicadores', 'Dados', 'Gráficos', 'Relatórios']
const EIXO = { fill: 'var(--economia-eixo)', fontSize: 12 }
const TOOLTIP = {
  backgroundColor: 'var(--economia-papel)',
  borderColor: 'var(--economia-grade)',
  color: 'var(--economia-tinta)',
  borderRadius: 0,
}
const SERIE_INICIAL = { dados: [], carregando: true, erro: null }
const PERIODOS_GRAFICO = [
  { id: '6m', rotulo: '6 meses', meses: 6, anos: 1 },
  { id: '1a', rotulo: '1 ano', meses: 12, anos: 1 },
  { id: '5a', rotulo: '5 anos', meses: 60, anos: 5 },
  { id: '10a', rotulo: '10 anos', meses: 120, anos: 10 },
  { id: 'tudo', rotulo: 'Tudo', meses: null, anos: null },
]
const PERIODOS_ANUAIS = PERIODOS_GRAFICO.filter((opcao) => opcao.id !== '6m')

const intervalo = (serie) => {
  if (serie.length === 0) return ''
  if (serie.length === 1) return `, ${serie[0].periodo}`
  return `, ${serie[0].periodo} a ${serie.at(-1).periodo}`
}

function filtrarPorPeriodoGrafico(dados, periodoId) {
  if (!Array.isArray(dados) || dados.length === 0 || periodoId === 'tudo') {
    return dados
  }

  const opcao = PERIODOS_GRAFICO.find(({ id }) => id === periodoId)
  if (!opcao || (!opcao.meses && !opcao.anos)) {
    return dados
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
  const [periodoAtivo, setPeriodoAtivo] = useLocalStorage('eco-grafico-pib-filtro', 'tudo')
  const dados = filtrarPorPeriodoGrafico(serie.dados, periodoAtivo)
  const resumo = resumirSerieAcessivel(dados, {
    titulo: 'PIB do Brasil',
    formatarValor: formatarMoeda,
  })

  return (
    <Grafico
      titulo="PIB do Brasil (R$ trilhões)"
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
          tickFormatter={(v) => formatarNumero(v / 1e12, 0)}
        />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'var(--economia-realce)' }} formatter={(v) => [formatarMoeda(v), 'PIB']} />
        <Bar dataKey="valor" fill={COR} maxBarSize={48} />
      </BarChart>
    </Grafico>
  )
}

function GraficoPibPerCapita({ serie }) {
  const [periodoAtivo, setPeriodoAtivo] = useLocalStorage('eco-grafico-percapita-filtro', 'tudo')
  const dados = filtrarPorPeriodoGrafico(serie.dados, periodoAtivo)
  const resumo = resumirSerieAcessivel(dados, {
    titulo: 'PIB per capita do Brasil',
    formatarValor: formatarMoeda,
  })

  return (
    <Grafico
      titulo="PIB per capita do Brasil (R$)"
      subtitulo={`Valores correntes${intervalo(dados)}`}
      status={statusDe(serie)}
      resumoAcessivel={resumo}
      opcoesPeriodo={PERIODOS_ANUAIS}
      periodoAtivo={periodoAtivo}
      aoMudarPeriodo={setPeriodoAtivo}
    >
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} />
        <YAxis tick={EIXO} width={70} domain={['auto', 'auto']} tickFormatter={(v) => formatarNumero(v, 0)} />
        <Tooltip contentStyle={TOOLTIP} formatter={(v) => [formatarMoeda(v), 'PIB per capita']} />
        <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot={dados.length <= 24} />
      </LineChart>
    </Grafico>
  )
}

function GraficoIpca({ serie, className }) {
  const [periodoAtivo, setPeriodoAtivo] = useLocalStorage('eco-grafico-ipca-filtro', 'tudo')
  const dados = filtrarPorPeriodoGrafico(serie.dados, periodoAtivo)
  const periodo =
    dados.length > 0
      ? dados.length === 1
        ? ` · ${formatarMesAno(dados[0].periodo)}`
        : ` · ${formatarMesAno(dados[0].periodo)} a ${formatarMesAno(dados.at(-1).periodo)}`
      : ''
  const resumo = resumirSerieAcessivel(dados, {
    titulo: 'IPCA acumulado em 12 meses',
    formatarPeriodo: formatarMesAno,
    formatarValor: (v) => `${formatarNumero(v)}%`,
  })

  return (
    <Grafico
      titulo="IPCA (%)"
      subtitulo={`Acumulado em 12 meses${periodo}`}
      status={statusDe(serie)}
      resumoAcessivel={resumo}
      opcoesPeriodo={PERIODOS_GRAFICO}
      periodoAtivo={periodoAtivo}
      aoMudarPeriodo={setPeriodoAtivo}
      className={className}
    >
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickFormatter={formatarMesAno} minTickGap={24} />
        <YAxis tick={EIXO} width={55} tickFormatter={(v) => `${formatarNumero(v, 1)}%`} />
        <Tooltip contentStyle={TOOLTIP} labelFormatter={formatarMesAno} formatter={(v) => [`${formatarNumero(v)}%`, 'IPCA']} />
        <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot={dados.length <= 24} />
      </LineChart>
    </Grafico>
  )
}

function GraficoDesemprego({ serie, className }) {
  const [periodoAtivo, setPeriodoAtivo] = useLocalStorage('eco-grafico-desemprego-filtro', 'tudo')
  const dados = filtrarPorPeriodoGrafico(serie.dados, periodoAtivo)
  const periodo =
    dados.length > 0
      ? dados.length === 1
        ? ` · ${formatarTrimestreMovel(dados[0].periodo)}`
        : ` · ${formatarTrimestreMovel(dados[0].periodo)} a ${formatarTrimestreMovel(dados.at(-1).periodo)}`
      : ''
  const resumo = resumirSerieAcessivel(dados, {
    titulo: 'Taxa de desemprego',
    formatarPeriodo: formatarTrimestreMovel,
    formatarValor: (v) => `${formatarNumero(v, 1)}%`,
  })

  return (
    <Grafico
      titulo="Taxa de desemprego (%)"
      subtitulo={`Trimestres móveis · pessoas de 14 anos ou mais na força de trabalho${periodo}`}
      status={statusDe(serie)}
      resumoAcessivel={resumo}
      opcoesPeriodo={PERIODOS_GRAFICO}
      periodoAtivo={periodoAtivo}
      aoMudarPeriodo={setPeriodoAtivo}
      className={className}
    >
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickFormatter={formatarTrimestreMovel} minTickGap={24} />
        <YAxis tick={EIXO} width={55} domain={[0, 'auto']} tickFormatter={(v) => `${formatarNumero(v, 1)}%`} />
        <Tooltip contentStyle={TOOLTIP} labelFormatter={formatarTrimestreMovel} formatter={(v) => [`${formatarNumero(v, 1)}%`, 'Taxa de desemprego']} />
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

const ORIGENS_HUB = ['https://bahia-hub.vercel.app', 'http://localhost:5173']

export default function Economia() {
  const [temaEscuro, setTemaEscuro] = useLocalStorage('eco-tema-escuro', false)
  const [aba, setAba] = useLocalStorage('eco-aba-ativa', 'Visão Geral')
  const series = useIndicadores(INDICADORES)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', temaEscuro)
  }, [temaEscuro])

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setTemaEscuro(true)
    }

    const aoReceberMensagem = (event) => {
      if (!ORIGENS_HUB.includes(event.origin)) return
      if (event.data?.type === 'bahia-hub:theme') {
        const escuro = event.data.theme === 'dark'
        document.documentElement.classList.toggle('dark', escuro)
        setTemaEscuro(escuro)
      }
    }

    window.addEventListener('message', aoReceberMensagem)
    return () => window.removeEventListener('message', aoReceberMensagem)
  }, [setTemaEscuro])

  const { pib, perCapita, ipca, desemprego } = series
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
      data-theme={temaEscuro ? 'dark' : 'light'}
      data-print={aba === 'Relatórios' ? 'relatorio' : undefined}
    >
      <div className="economia-container">
        <header className="economia-cabecalho">
          <div className="economia-expediente">
            <span className="economia-marca">Eco<span aria-hidden="true"> / </span>Dashboard</span>
          </div>
          <button
            type="button"
            aria-label={temaEscuro ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            onClick={() => setTemaEscuro((atual) => !atual)}
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
              <GraficoIpca serie={ipca} />
              <TabelaIndicadores linhas={linhas} />
              <GraficoDesemprego serie={desemprego} className="economia-secao--larga" />
            </div>
          )}

          {aba === 'Gráficos' && (
            <div className="economia-grade">
              <GraficoPib serie={pib} />
              <GraficoPibPerCapita serie={perCapita} />
              <GraficoIpca serie={ipca} />
              <GraficoDesemprego serie={desemprego} />
            </div>
          )}

          {aba === 'Dados' && <DadosEconomia series={series} {...series} />}

          {aba === 'Relatórios' && <RelatoriosEconomia series={series} {...series} />}
        </main>

        <footer className="economia-rodape">
          <span>Eco / Dashboard</span>
          <p>Fonte: Instituto Brasileiro de Geografia e Estatística · IBGE</p>
          <a href="#economia-aba-0">Voltar às seções <span aria-hidden="true">↑</span></a>
        </footer>
      </div>
    </div>
  )
}
