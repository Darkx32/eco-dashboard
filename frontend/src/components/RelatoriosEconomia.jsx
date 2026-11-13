import { useState } from 'react'
import { INDICADORES } from '../data/indicadores'
import { formatarPeriodo } from '../utils/dadosEconomia'
import {
  calcularRelatorio,
  formatarValorRelatorio,
  formatarVariacaoRelatorio,
  gerarResumoRelatorio,
} from '../utils/relatorioEconomia'

export default function RelatoriosEconomia({ pib, perCapita, ipca, desemprego }) {
  const [indicadorId, setIndicadorId] = useState('pib')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const indicador = INDICADORES.find(({ id }) => id === indicadorId)
  const serie = { pib, perCapita, ipca, desemprego }[indicadorId]
  const periodos = [...new Set(serie.dados.map(({ periodo }) => String(periodo)))].sort()
  const relatorio = calcularRelatorio(serie.dados, inicio, fim)
  const status = serie.carregando
    ? 'Carregando relatório…'
    : serie.erro
      ? 'Não foi possível carregar este indicador. Tente novamente em instantes.'
      : !relatorio
        ? 'Sem valores disponíveis para o período selecionado.'
        : null
  const periodo = (p) => formatarPeriodo(p, indicador.frequencia)
  const valor = (v) => formatarValorRelatorio(v, indicador.unidade)

  function limparPeriodo() {
    setInicio('')
    setFim('')
  }

  return (
    <section className="economia-relatorios" aria-labelledby="economia-relatorios-titulo">
      <div className="economia-dados-cabecalho economia-relatorio-controles">
        <h2 id="economia-relatorios-titulo" className="economia-secao-titulo">Relatórios</h2>
        <button type="button" className="economia-acao" disabled={Boolean(status)} onClick={() => window.print()}>
          Imprimir / Salvar PDF
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6z" />
            <path d="M17 12h1" />
          </svg>
        </button>
      </div>

      <div className="economia-filtros economia-relatorio-controles">
        <label className="economia-campo" htmlFor="relatorio-indicador">
          Indicador
          <select id="relatorio-indicador" value={indicadorId} onChange={(event) => {
            setIndicadorId(event.target.value)
            limparPeriodo()
          }}>
            {INDICADORES.map(({ id, nome }) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </label>
        <label className="economia-campo" htmlFor="relatorio-inicio">
          De
          <select id="relatorio-inicio" value={inicio} disabled={Boolean(serie.carregando || serie.erro || !periodos.length)} onChange={(event) => {
            const proximo = event.target.value
            setInicio(proximo)
            if (fim && proximo > fim) setFim(proximo)
          }}>
            <option value="">Primeiro disponível</option>
            {periodos.map((p) => <option key={p} value={p}>{periodo(p)}</option>)}
          </select>
        </label>
        <label className="economia-campo" htmlFor="relatorio-fim">
          Até
          <select id="relatorio-fim" value={fim} disabled={Boolean(serie.carregando || serie.erro || !periodos.length)} onChange={(event) => {
            const proximo = event.target.value
            setFim(proximo)
            if (inicio && proximo && proximo < inicio) setInicio(proximo)
          }}>
            <option value="">Último disponível</option>
            {periodos.map((p) => <option key={p} value={p}>{periodo(p)}</option>)}
          </select>
        </label>
        <button type="button" className="economia-limpar" onClick={limparPeriodo} disabled={!inicio && !fim}>Limpar período</button>
      </div>

      <p className="economia-sr-only" role="status" aria-live="polite">
        {status || `Relatório de ${indicador.nome}, de ${periodo(relatorio.inicial.periodo)} a ${periodo(relatorio.final.periodo)}.`}
      </p>

      {status ? <p className="economia-relatorio-status" role="status">{status}</p> : (
        <article className="economia-relatorio-documento" aria-labelledby="relatorio-documento-titulo">
          <header className="economia-relatorio-cabecalho">
            <div className="economia-relatorio-expediente"><span>Eco / Dashboard</span><span>Brasil · IBGE</span></div>
            <p className="economia-sobretitulo">Relatório econômico</p>
            <h3 id="relatorio-documento-titulo">{indicador.nome}</h3>
            <p className="economia-relatorio-periodo">{periodo(relatorio.inicial.periodo)} — {periodo(relatorio.final.periodo)}</p>
            <p className="economia-legenda">{indicador.frequencia} · {relatorio.registros.length} {relatorio.registros.length === 1 ? 'registro' : 'registros'}</p>
          </header>

          <dl className="economia-relatorio-comparacao">
            <div>
              <dt>Valor inicial</dt>
              <dd>{valor(relatorio.inicial.valor)}</dd>
              <span>{periodo(relatorio.inicial.periodo)}</span>
            </div>
            <div>
              <dt>Valor final</dt>
              <dd>{valor(relatorio.final.valor)}</dd>
              <span>{periodo(relatorio.final.periodo)}</span>
            </div>
            <div>
              <dt>{indicador.unidade === '%' ? 'Diferença entre taxas' : 'Variação nominal'}</dt>
              <dd className="economia-relatorio-variacao">{relatorio.comparavel ? formatarVariacaoRelatorio(relatorio, indicador.unidade) : '—'}</dd>
              <span>{!relatorio.comparavel ? 'Um registro no período' : indicador.unidade === '%' ? 'Pontos percentuais' : 'Entre o início e o fim'}</span>
            </div>
          </dl>

          <section className="economia-relatorio-leitura" aria-labelledby="relatorio-leitura-titulo">
            <h4 id="relatorio-leitura-titulo">Síntese do período</h4>
            <p>{gerarResumoRelatorio(indicador, relatorio)}</p>
          </section>

          <dl className="economia-relatorio-extremos">
            <div>
              <dt>Menor valor</dt>
              <dd>{valor(relatorio.menor.valor)}</dd>
              <span>{relatorio.menor.periodos.map(periodo).join(' · ')}</span>
            </div>
            <div>
              <dt>Maior valor</dt>
              <dd>{valor(relatorio.maior.valor)}</dd>
              <span>{relatorio.maior.periodos.map(periodo).join(' · ')}</span>
            </div>
          </dl>

          <section className="economia-relatorio-registros" aria-labelledby="relatorio-registros-titulo">
            <h4 id="relatorio-registros-titulo">Registros do período</h4>
            <div className="economia-tabela-rolagem">
              <table className="economia-tabela economia-tabela-dados">
                <caption className="economia-sr-only">{indicador.nome} — valores por período</caption>
                <thead><tr><th scope="col">Referência</th><th scope="col">Valor</th><th scope="col">Unidade</th></tr></thead>
                <tbody>{relatorio.registros.map((registro) => (
                  <tr key={registro.periodo}>
                    <th scope="row">{periodo(registro.periodo)}</th>
                    <td>{Number.isFinite(registro.valor) ? registro.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 20 }) : 'Indisponível'}</td>
                    <td>{indicador.unidade}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <footer className="economia-relatorio-rodape">
            <p>{indicador.descricao}</p>
            {indicador.unidade === 'R$' && <p>Valores nominais, sem ajuste pela inflação.</p>}
            {indicador.id === 'desemprego' && <p>Trimestres móveis consecutivos compartilham dois meses.</p>}
            {relatorio.indisponiveis > 0 && <p>{relatorio.indisponiveis} {relatorio.indisponiveis === 1 ? 'registro sem valor numérico, excluído' : 'registros sem valor numérico, excluídos'} dos cálculos.</p>}
            <p>Fonte: Instituto Brasileiro de Geografia e Estatística · IBGE</p>
          </footer>
        </article>
      )}
    </section>
  )
}
