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
import { buscarSerie } from '../services/api'

const COR = '#0ea5e9'
const ABAS = ['Visão Geral', 'Indicadores', 'Dados', 'Gráficos', 'Relatórios']
const CARD = 'bg-surface rounded-xl shadow-card border border-slate-100 p-6'
const EIXO = { fill: '#64748b', fontSize: 12 }
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']


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


function useSerie(agregado, variavel) {
  const [estado, setEstado] = useState({ dados: [], carregando: true, erro: null })

  useEffect(() => {
    let ativo = true
    buscarSerie(agregado, variavel)
      .then((dados) => ativo && setEstado({ dados, carregando: false, erro: null }))
      .catch((e) => ativo && setEstado({ dados: [], carregando: false, erro: e.message }))
    return () => {
      ativo = false
    }
  }, [agregado, variavel])

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
    <span className={`font-medium ${valor >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
      {valor >= 0 ? '↑' : '↓'} {num(Math.abs(valor), 1)}%
    </span>
  )
}

function Kpi({ icone, titulo, status, valor, detalhe, variacao }) {
  return (
    <div className={`${CARD} flex items-center gap-4`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-2xl">
        {icone}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{titulo}</p>
        {status ? (
          <p className="mt-1 text-sm text-slate-500">{status}</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-800">{valor}</p>
            <p className="text-xs text-slate-500">
              {detalhe} {variacao != null && <Variacao valor={variacao} />}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Grafico({ titulo, subtitulo, status, className = '', children }) {
  return (
    <div className={`${CARD} ${className}`}>
      <h2 className="text-lg font-semibold text-slate-800">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
      <div className="mt-4 h-72">
        {status ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
            {status}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </div>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} />
        <YAxis
          tick={EIXO}
          domain={[0, 'auto']}
          allowDecimals={false}
          tickFormatter={(v) => num(v / 1e12, 0)}
        />
        <Tooltip formatter={(v) => [brl(v), 'PIB']} />
        <Bar dataKey="valor" fill={COR} radius={[4, 4, 0, 0]} />
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
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} />
        <YAxis tick={EIXO} width={70} domain={[30000, 'auto']} tickFormatter={(v) => num(v, 0)} />
        <Tooltip formatter={(v) => [brl(v), 'PIB per capita']} />
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
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickFormatter={mesAno} />
        <YAxis tick={EIXO} width={55} tickFormatter={(v) => `${num(v, 1)}%`} />
        <Tooltip labelFormatter={mesAno} formatter={(v) => [`${num(v)}%`, 'IPCA 12 meses']} />
        <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot />
      </LineChart>
    </Grafico>
  )
}

function TabelaIndicadores({ linhas }) {
  return (
    <div className={CARD}>
      <h2 className="text-lg font-semibold text-slate-800">Principais indicadores</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="py-2 font-medium">Indicador</th>
              <th className="py-2 font-medium">Valor</th>
              <th className="py-2 text-right font-medium">Referência</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.nome} className="border-b border-slate-100 last:border-0">
                <td className="py-3 text-slate-600">{l.nome}</td>
                <td className="py-3 font-medium text-slate-800">{l.valor}</td>
                <td className="py-3 text-right text-slate-500">{l.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmBreve({ aba }) {
  return (
    <div className={`${CARD} py-16 text-center`}>
      <p className="text-lg font-semibold text-slate-800">{aba}</p>
      <p className="mt-2 text-sm text-slate-500">PH VIADO.</p>
    </div>
  )
}

export default function Economia() {
  const [aba, setAba] = useState('Visão Geral')

 
  const pib = useSerie(6784, 9808) 
  const perCapita = useSerie(6784, 9812)
  const ipca = useSerie(7060, 2265) 

  
  const pibAtual = pib.dados.at(-1)
  const perCapitaAtual = perCapita.dados.at(-1)
  const ipcaAtual = ipca.dados.at(-1)

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
  ]

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Economia</h1>
            <p className="mt-1 text-sm text-slate-600">
              Indicadores econômicos do Brasil · fonte: IBGE
            </p>
          </div>
        </div>

        <div className="border-b border-slate-200">
          <div role="tablist" className="-mb-px flex gap-1 overflow-x-auto">
            {ABAS.map((nome) => (
              <button
                key={nome}
                type="button"
                role="tab"
                aria-selected={aba === nome}
                onClick={() => setAba(nome)}
                className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                  aba === nome
                    ? 'border-modulo-economia text-modulo-economia'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>

        {aba === 'Visão Geral' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Kpi
                icone="📊"
                titulo="PIB do Brasil"
                status={statusDe(pib)}
                valor={pibAtual && trilhoes(pibAtual.valor)}
                detalhe={pibAtual && `${pibAtual.periodo} · nominal`}
                variacao={crescimento(pib.dados)}
              />
              <Kpi
                icone="💰"
                titulo="PIB per capita do Brasil"
                status={statusDe(perCapita)}
                valor={perCapitaAtual && brl(perCapitaAtual.valor)}
                detalhe={perCapitaAtual && `${perCapitaAtual.periodo} · nominal`}
                variacao={crescimento(perCapita.dados)}
              />
              <Kpi
                icone="🛒"
                titulo="IPCA acumulado em 12 meses"
                status={statusDe(ipca)}
                valor={ipcaAtual && `${num(ipcaAtual.valor)}%`}
                detalhe={ipcaAtual && mesAno(ipcaAtual.periodo)}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <GraficoPib serie={pib} />
              <TabelaIndicadores linhas={linhas} />
            </div>
          </>
        )}

        {aba === 'Indicadores' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <GraficoIpca serie={ipca} />
            <TabelaIndicadores linhas={linhas} />
          </div>
        )}

        {aba === 'Gráficos' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <GraficoPib serie={pib} />
            <GraficoPibPerCapita serie={perCapita} />
            <GraficoIpca serie={ipca} className="lg:col-span-2" />
          </div>
        )}

        {(aba === 'Dados' || aba === 'Relatórios') && <EmBreve aba={aba} />}
      </div>
    </div>
  )
}
