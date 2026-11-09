import { useEffect, useState } from 'react'
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
import { buscarPibAnual, buscarSerie } from '../services/api'
import DadosEconomia from '../components/DadosEconomia'
import RelatoriosEconomia from '../components/RelatoriosEconomia'
import { formatarTrimestreMovel } from '../utils/dadosEconomia'
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
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const buscarPerCapita = () => buscarSerie(6784, 9812)
const buscarIpca = () => buscarSerie(7060, 2265)
const buscarDesemprego = () => buscarSerie(6381, 4099)


const num = (n, casas = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const brl = (n) => `R$ ${num(n, 0)}`
const trilhoes = (n, casas = 1) => `R$ ${num(n / 1e12, casas)} tri`


const mesAno = (p) => `${MESES[Number(p.slice(4, 6)) - 1]}/${p.slice(2, 4)}`


const crescimento = (serie) => {
  if (serie.length < 2) return null
  const [anterior, atual] = serie.slice(-2)
  return (atual.valor / anterior.valor - 1) * 100
}


const intervalo = (serie) =>
  serie.length > 0 ? `, ${serie[0].periodo} a ${serie.at(-1).periodo}` : ''


function useSerie(carregar) {
  const [estado, setEstado] = useState({ dados: [], carregando: true, erro: null })

  useEffect(() => {
    let ativo = true
    carregar()
      .then((dados) => ativo && setEstado({ dados, carregando: false, erro: null }))
      .catch((e) => ativo && setEstado({ dados: [], carregando: false, erro: e.message }))
    return () => {
      ativo = false
    }
  }, [carregar])

  return estado
}


const statusDe = (s) => {
  if (s.carregando) return 'Carregando...'
  if (s.erro) return 'Não foi possível carregar os dados. Tente novamente em instantes.'
  if (s.dados.length === 0) return 'Sem dados disponíveis.'
  return null
}


function Variacao({ valor }) {
  return (
    <span className={`economia-variacao ${valor >= 0 ? 'economia-variacao--alta' : 'economia-variacao--baixa'}`}>
      {valor >= 0 ? '↑' : '↓'} {num(Math.abs(valor), 1)}%
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

function Grafico({ titulo, subtitulo, status, className = '', children }) {
  return (
    <section className={`economia-secao ${className}`}>
      <h2 className="economia-secao-titulo">{titulo}</h2>
      <p className="economia-legenda">{subtitulo}</p>
      <div className="economia-grafico">
        {status ? (
          <div className="economia-grafico-status" role="status">
            {status}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

function GraficoPib({ serie }) {
  return (
    <Grafico
      titulo="PIB do Brasil (R$ trilhões)"
      subtitulo={`Valores correntes${intervalo(serie.dados)}`}
      status={statusDe(serie)}
    >
      <BarChart data={serie.dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} />
        <YAxis
          tick={EIXO}
          domain={[0, 'auto']}
          allowDecimals={false}
          tickFormatter={(v) => num(v / 1e12, 0)}
        />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'var(--economia-realce)' }} formatter={(v) => [brl(v), 'PIB']} />
        <Bar dataKey="valor" fill={COR} maxBarSize={48} />
      </BarChart>
    </Grafico>
  )
}

function GraficoPibPerCapita({ serie }) {
  return (
    <Grafico
      titulo="PIB per capita do Brasil (R$)"
      subtitulo={`Valores correntes${intervalo(serie.dados)}`}
      status={statusDe(serie)}
    >
      <LineChart data={serie.dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} />
        <YAxis tick={EIXO} width={70} domain={[30000, 'auto']} tickFormatter={(v) => num(v, 0)} />
        <Tooltip contentStyle={TOOLTIP} formatter={(v) => [brl(v), 'PIB per capita']} />
        <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot />
      </LineChart>
    </Grafico>
  )
}

function GraficoIpca({ serie, className }) {
  const dados = serie.dados
  const sub =
    dados.length > 0
      ? `${mesAno(dados[0].periodo)} a ${mesAno(dados.at(-1).periodo)}`
      : 'Acumulado em 12 meses'

  return (
    <Grafico
      titulo="IPCA – acumulado em 12 meses (%)"
      subtitulo={sub}
      status={statusDe(serie)}
      className={className}
    >
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickFormatter={mesAno} />
        <YAxis tick={EIXO} width={55} tickFormatter={(v) => `${num(v, 1)}%`} />
        <Tooltip contentStyle={TOOLTIP} labelFormatter={mesAno} formatter={(v) => [`${num(v)}%`, 'IPCA 12 meses']} />
        <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot />
      </LineChart>
    </Grafico>
  )
}

function GraficoDesemprego({ serie, className }) {
  const dados = serie.dados
  const periodo = dados.length > 0
    ? ` · ${formatarTrimestreMovel(dados[0].periodo)} a ${formatarTrimestreMovel(dados.at(-1).periodo)}`
    : ''

  return (
    <Grafico
      titulo="Taxa de desemprego (%)"
      subtitulo={`Trimestres móveis · pessoas de 14 anos ou mais na força de trabalho${periodo}`}
      status={statusDe(serie)}
      className={className}
    >
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickFormatter={formatarTrimestreMovel} minTickGap={24} />
        <YAxis tick={EIXO} width={55} domain={[0, 'auto']} tickFormatter={(v) => `${num(v, 1)}%`} />
        <Tooltip contentStyle={TOOLTIP} labelFormatter={formatarTrimestreMovel} formatter={(v) => [`${num(v, 1)}%`, 'Taxa de desemprego']} />
        <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot />
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

export default function Economia() {
  const [temaEscuro, setTemaEscuro] = useState(false)
  const [aba, setAba] = useState('Visão Geral')

 
  const pib = useSerie(buscarPibAnual)
  const perCapita = useSerie(buscarPerCapita)
  const ipca = useSerie(buscarIpca)
  const desemprego = useSerie(buscarDesemprego)

  
  const pibAtual = pib.dados.at(-1)
  const perCapitaAtual = perCapita.dados.at(-1)
  const ipcaAtual = ipca.dados.at(-1)
  const desempregoAtual = desemprego.dados.at(-1)

  const linhas = [
    {
      nome: 'PIB (valores correntes)',
      valor: pibAtual ? trilhoes(pibAtual.valor) : statusDe(pib),
      ref: pibAtual?.periodo,
    },
    {
      nome: 'PIB per capita (valores correntes)',
      valor: perCapitaAtual ? brl(perCapitaAtual.valor) : statusDe(perCapita),
      ref: perCapitaAtual?.periodo,
    },
    {
      nome: 'IPCA – acumulado em 12 meses',
      valor: ipcaAtual ? `${num(ipcaAtual.valor)}%` : statusDe(ipca),
      ref: ipcaAtual && mesAno(ipcaAtual.periodo),
    },
    {
      nome: 'Taxa de desemprego',
      valor: desempregoAtual ? `${num(desempregoAtual.valor, 1)}%` : statusDe(desemprego),
      ref: desempregoAtual && formatarTrimestreMovel(desempregoAtual.periodo),
    },
  ]

  return (
    <div
      className="economia"
      data-theme={temaEscuro ? 'dark' : 'light'}
      data-print={aba === 'Relatórios' ? 'relatorio' : undefined}
    >
      <div className="economia-container">
        <header className="economia-cabecalho">
          <div className="economia-expediente">
            <span className="economia-marca">Eco<span> / </span>Dashboard</span>
            <span className="economia-edicao">Brasil · Indicadores econômicos</span>
          </div>
          <button
            type="button"
            aria-label="Tema escuro"
            aria-pressed={temaEscuro}
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

        <div className="economia-abertura">
          <div>
            <p className="economia-sobretitulo">O país em números</p>
            <h1>Economia<span>.</span></h1>
          </div>
          <p className="economia-introducao">
            Produção, renda, inflação e trabalho.<br />
            Um olhar sobre os indicadores do Brasil, a partir dos dados do IBGE.
          </p>
        </div>

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
          <span className="economia-fonte">Fonte: IBGE</span>
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
              <Kpi
                titulo="PIB do Brasil"
                status={statusDe(pib)}
                valor={pibAtual && trilhoes(pibAtual.valor)}
                detalhe={pibAtual && `${pibAtual.periodo} · nominal`}
                variacao={crescimento(pib.dados)}
              />
              <Kpi
                titulo="PIB per capita do Brasil"
                status={statusDe(perCapita)}
                valor={perCapitaAtual && brl(perCapitaAtual.valor)}
                detalhe={perCapitaAtual && `${perCapitaAtual.periodo} · nominal`}
                variacao={crescimento(perCapita.dados)}
              />
              <Kpi
                titulo="IPCA acumulado em 12 meses"
                status={statusDe(ipca)}
                valor={ipcaAtual && `${num(ipcaAtual.valor)}%`}
                detalhe={ipcaAtual && mesAno(ipcaAtual.periodo)}
              />
              <Kpi
                titulo="Taxa de desemprego"
                status={statusDe(desemprego)}
                valor={desempregoAtual && `${num(desempregoAtual.valor, 1)}%`}
                detalhe={desempregoAtual && `${formatarTrimestreMovel(desempregoAtual.periodo)} · trimestre móvel`}
              />
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

        {aba === 'Dados' && <DadosEconomia pib={pib} perCapita={perCapita} ipca={ipca} desemprego={desemprego} />}
        {aba === 'Relatórios' && <RelatoriosEconomia pib={pib} perCapita={perCapita} ipca={ipca} desemprego={desemprego} />}
        </main>

        <footer className="economia-rodape">
          <span>Eco / Dashboard</span>
          <p>Fonte: Instituto Brasileiro de Geografia e Estatística · IBGE</p>
          <a href="#economia-aba-0">Voltar às seções ↑</a>
        </footer>
      </div>
    </div>
  )
}
