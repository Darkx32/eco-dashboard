import { useState } from 'react'
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
import { ipcaMensal, pibPerCapitaPorAno, pibPorAno } from '../data/mock'

const COR = '#0ea5e9' 
const ABAS = ['Visão Geral', 'Indicadores', 'Dados', 'Gráficos', 'Relatórios']
const CARD = 'bg-surface rounded-xl shadow-card border border-slate-100 p-6' 
const EIXO = { fill: '#64748b', fontSize: 12 }
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']


const num = (n, casas = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const brl = (n) => `R$ ${num(n, 0)}`
const mesAno = (p) => {
  const [ano, mes] = p.split('-')
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`
}
const crescimento = (serie) => {
  const [anterior, atual] = serie.slice(-2)
  return (atual.valor / anterior.valor - 1) * 100
}
const acumulado = (serie) => (serie.reduce((t, x) => t * (1 + x.valor / 100), 1) - 1) * 100


const pibAtual = pibPorAno.at(-1)
const perCapitaAtual = pibPerCapitaPorAno.at(-1)
const ipcaAtual = ipcaMensal.at(-1)
const ipca12m = acumulado(ipcaMensal)
const ipcaNoAno = acumulado(ipcaMensal.filter((i) => i.periodo.startsWith(ipcaAtual.periodo.slice(0, 4))))

const LINHAS = [
  { nome: 'PIB (valores correntes)', valor: `R$ ${num(pibAtual.valor)} tri`, ref: pibAtual.periodo },
  { nome: 'PIB per capita (valores correntes)', valor: brl(perCapitaAtual.valor), ref: perCapitaAtual.periodo },
  { nome: 'IPCA – variação mensal', valor: `${num(ipcaAtual.valor)}%`, ref: mesAno(ipcaAtual.periodo) },
  { nome: 'IPCA – acumulado no ano', valor: `${num(ipcaNoAno)}%`, ref: mesAno(ipcaAtual.periodo) },
  { nome: 'IPCA – acumulado em 12 meses', valor: `${num(ipca12m)}%`, ref: mesAno(ipcaAtual.periodo) },
]


function Variacao({ valor }) {
  return (
    <span className={`font-medium ${valor >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
      {valor >= 0 ? '↑' : '↓'} {num(Math.abs(valor), 1)}%
    </span>
  )
}

function Kpi({ icone, titulo, valor, detalhe, variacao }) {
  return (
    <div className={`${CARD} flex items-center gap-4`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-2xl">
        {icone}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{titulo}</p>
        <p className="text-2xl font-bold text-slate-800">{valor}</p>
        <p className="text-xs text-slate-500">
          {detalhe} {variacao !== undefined && <Variacao valor={variacao} />}
        </p>
      </div>
    </div>
  )
}


function Grafico({ titulo, subtitulo, className = '', children }) {
  return (
    <div className={`${CARD} ${className}`}>
      <h2 className="text-lg font-semibold text-slate-800">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function GraficoPib() {
  return (
    <Grafico titulo="PIB do Brasil (R$ trilhões)" subtitulo="Valores correntes, 2018 a 2023">
      <BarChart data={pibPorAno}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} />
        <YAxis tick={EIXO} domain={[0, 'auto']} allowDecimals={false} tickFormatter={(v) => num(v, 0)} />
        <Tooltip formatter={(v) => [`R$ ${num(v)} tri`, 'PIB']} />
        <Bar dataKey="valor" fill={COR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </Grafico>
  )
}

function GraficoPibPerCapita() {
  return (
    <Grafico titulo="PIB per capita do Brasil (R$)" subtitulo="Valores correntes, 2018 a 2023">
      <LineChart data={pibPerCapitaPorAno}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} />
        <YAxis tick={EIXO} width={70} domain={[30000, 'auto']} tickFormatter={(v) => num(v, 0)} />
        <Tooltip formatter={(v) => [brl(v), 'PIB per capita']} />
        <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot />
      </LineChart>
    </Grafico>
  )
}

function GraficoIpca({ className }) {
  return (
    <Grafico titulo="IPCA – variação mensal (%)" subtitulo="Últimos 12 meses" className={className}>
      <LineChart data={ipcaMensal}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickFormatter={mesAno} />
        <YAxis tick={EIXO} width={55} tickFormatter={(v) => `${num(v, 1)}%`} />
        <Tooltip labelFormatter={mesAno} formatter={(v) => [`${num(v)}%`, 'IPCA']} />
        <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot />
      </LineChart>
    </Grafico>
  )
}

function TabelaIndicadores() {
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
            {LINHAS.map((l) => (
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
      <p className="mt-2 text-sm text-slate-500">To fazendo, te acalma.</p>
    </div>
  )
}

export default function Economia() {
  const [aba, setAba] = useState('Visão Geral')

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Economia</h1>
            <p className="mt-1 text-sm text-slate-600">
              Indicadores econômicos do Brasil · dados de exemplo
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
                valor={`R$ ${num(pibAtual.valor, 1)} tri`}
                detalhe={pibAtual.periodo}
                variacao={crescimento(pibPorAno)}
              />
              <Kpi
                icone="💰"
                titulo="PIB per capita do Brasil"
                valor={brl(perCapitaAtual.valor)}
                detalhe={perCapitaAtual.periodo}
                variacao={crescimento(pibPerCapitaPorAno)}
              />
              <Kpi
                icone="🛒"
                titulo="IPCA acumulado em 12 meses"
                valor={`${num(ipca12m)}%`}
                detalhe={mesAno(ipcaAtual.periodo)}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <GraficoPib />
              <TabelaIndicadores />
            </div>
          </>
        )}

        {aba === 'Indicadores' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <GraficoIpca />
            <TabelaIndicadores />
          </div>
        )}

        {aba === 'Gráficos' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <GraficoPib />
            <GraficoPibPerCapita />
            <GraficoIpca className="lg:col-span-2" />
          </div>
        )}

        {(aba === 'Dados' || aba === 'Relatórios') && <EmBreve aba={aba} />}
      </div>
    </div>
  )
}
