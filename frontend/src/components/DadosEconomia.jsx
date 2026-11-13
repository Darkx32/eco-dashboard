import { useState } from 'react'
import { INDICADORES } from '../data/indicadores'
import { filtrarSerie, formatarPeriodo, gerarCsv } from '../utils/dadosEconomia'

export default function DadosEconomia({ pib, perCapita, ipca, desemprego }) {
  const [indicadorId, setIndicadorId] = useState('pib')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const indicador = INDICADORES.find(({ id }) => id === indicadorId)
  const serie = { pib, perCapita, ipca, desemprego }[indicadorId]
  const periodos = [...new Set(serie.dados.map(({ periodo }) => String(periodo)))].sort()
  const dados = filtrarSerie(serie.dados, inicio, fim)
  const status = serie.carregando
    ? 'Carregando dados…'
    : serie.erro
      ? 'Não foi possível carregar este indicador. Tente novamente em instantes.'
      : serie.dados.length === 0
        ? 'Sem dados disponíveis para este indicador.'
        : dados.length === 0
          ? 'Nenhum registro no intervalo selecionado.'
          : null

  function baixarCsv() {
    const blob = new Blob([gerarCsv(indicador, dados)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `eco-${indicadorId}-${inicio || periodos[0]}-${fim || periodos.at(-1)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function limparPeriodo() {
    setInicio('')
    setFim('')
  }

  return (
    <section className="economia-dados" aria-labelledby="economia-dados-titulo">
      <div className="economia-dados-cabecalho">
        <div>
          <h2 id="economia-dados-titulo" className="economia-secao-titulo">Dados por período</h2>
        </div>
        <button className="economia-acao" type="button" onClick={baixarCsv} disabled={Boolean(status)}>
          Baixar CSV <span aria-hidden="true">↓</span>
        </button>
      </div>

      <div className="economia-filtros">
        <label className="economia-campo" htmlFor="economia-indicador">
          Indicador
          <select id="economia-indicador" value={indicadorId} onChange={(event) => {
            setIndicadorId(event.target.value)
            limparPeriodo()
          }}>
            {INDICADORES.map(({ id, nome }) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </label>
        <label className="economia-campo" htmlFor="economia-inicio">
          De
          <select id="economia-inicio" value={inicio} disabled={periodos.length === 0 || serie.carregando || Boolean(serie.erro)} onChange={(event) => {
            const proximo = event.target.value
            setInicio(proximo)
            if (fim && proximo > fim) setFim(proximo)
          }}>
            <option value="">Primeiro disponível</option>
            {periodos.map((periodo) => <option key={periodo} value={periodo}>{formatarPeriodo(periodo, indicador.frequencia)}</option>)}
          </select>
        </label>
        <label className="economia-campo" htmlFor="economia-fim">
          Até
          <select id="economia-fim" value={fim} disabled={periodos.length === 0 || serie.carregando || Boolean(serie.erro)} onChange={(event) => {
            const proximo = event.target.value
            setFim(proximo)
            if (inicio && proximo && proximo < inicio) setInicio(proximo)
          }}>
            <option value="">Último disponível</option>
            {periodos.map((periodo) => <option key={periodo} value={periodo}>{formatarPeriodo(periodo, indicador.frequencia)}</option>)}
          </select>
        </label>
        <button className="economia-limpar" type="button" onClick={limparPeriodo} disabled={!inicio && !fim}>
          Limpar período
        </button>
      </div>

      <p className="economia-legenda">{indicador.descricao}</p>

      <div className="economia-dados-resumo" role="status" aria-live="polite">
        {status || `${dados.length} de ${serie.dados.length} registros · ${indicador.frequencia} · Brasil`}
      </div>

      {!status && (
        <div className="economia-tabela-rolagem">
          <table className="economia-tabela economia-tabela-dados">
            <caption className="economia-sr-only">{indicador.nome} — valores por período, em ordem cronológica</caption>
            <thead>
              <tr>
                <th scope="col">Período</th>
                <th scope="col">Valor</th>
                <th scope="col">Unidade</th>
              </tr>
            </thead>
            <tbody>
              {dados.map(({ periodo, valor }) => (
                <tr key={periodo}>
                  <th scope="row">{formatarPeriodo(periodo, indicador.frequencia)}</th>
                  <td>{Number.isFinite(valor) ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 20 }) : 'Indisponível'}</td>
                  <td>{indicador.unidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="economia-nota">Fonte: IBGE.</p>
    </section>
  )
}
