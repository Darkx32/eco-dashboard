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
import { useLocalStorage } from '../hooks/useLocalStorage'
import { buscarPibMunicipiosBahia, buscarSerieMunicipioBahia } from '../services/api'
import { formatarBilhoes, formatarMoeda, formatarNumero } from '../utils/dadosEconomia'

const COR = 'var(--economia-destaque)'
const EIXO = { fill: 'var(--economia-eixo)', fontSize: 12 }
const TOOLTIP = {
  backgroundColor: 'var(--economia-papel)',
  borderColor: 'var(--economia-grade)',
  color: 'var(--economia-tinta)',
  borderRadius: 0,
}

function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function formatarPibCurto(valor) {
  if (!Number.isFinite(valor)) return 'Indisponível'
  if (valor >= 1e9) return formatarBilhoes(valor, 1)
  return `R$ ${formatarNumero(valor / 1e6, 1)} mi`
}

export default function MunicipiosBahia() {
  const [listaEstado, setListaEstado] = useState({
    carregando: true,
    erro: null,
    periodo: '',
    total: 0,
    municipios: [],
  })
  const [busca, setBusca] = useState('')
  const [municipioId, setMunicipioId] = useLocalStorage('eco-municipio-ba-id', '2927408')
  const [detalheEstado, setDetalheEstado] = useState({
    id: null,
    carregando: true,
    erro: null,
    pib: [],
    perCapita: [],
  })

  useEffect(() => {
    let ativo = true

    buscarPibMunicipiosBahia()
      .then((dados) => {
        if (!ativo) return
        setListaEstado({
          carregando: false,
          erro: null,
          periodo: dados.periodo,
          total: dados.total,
          municipios: dados.municipios,
        })
      })
      .catch((erro) => {
        if (!ativo) return
        setListaEstado({
          carregando: false,
          erro: erro.message,
          periodo: '',
          total: 0,
          municipios: [],
        })
      })

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (!municipioId) return undefined
    let ativo = true

    buscarSerieMunicipioBahia(municipioId)
      .then((dados) => {
        if (!ativo) return
        setDetalheEstado({
          id: dados.id,
          carregando: false,
          erro: null,
          pib: dados.pib,
          perCapita: dados.perCapita,
        })
      })
      .catch((erro) => {
        if (!ativo) return
        setDetalheEstado({
          id: municipioId,
          carregando: false,
          erro: erro.message,
          pib: [],
          perCapita: [],
        })
      })

    return () => {
      ativo = false
    }
  }, [municipioId])

  const termo = normalizarTexto(busca.trim())
  const filtrados = termo
    ? listaEstado.municipios.filter((m) => normalizarTexto(m.nome).includes(termo))
    : listaEstado.municipios

  const municipioSelecionado =
    listaEstado.municipios.find((m) => m.id === municipioId) ?? listaEstado.municipios[0]

  const carregandoDetalhe = detalheEstado.carregando || detalheEstado.id !== municipioId
  const pibAtual = detalheEstado.pib.at(-1)
  const perCapitaAtual = detalheEstado.perCapita.at(-1)

  const escalaBilhoes = (detalheEstado.pib.at(-1)?.valor ?? 0) >= 1e9

  return (
    <section className="economia-municipios" aria-labelledby="economia-municipios-titulo">
      <div className="economia-dados-cabecalho">
        <div>
          <h2 id="economia-municipios-titulo" className="economia-secao-titulo">
            Municípios da Bahia
          </h2>
          <p className="economia-legenda">
            {listaEstado.periodo
              ? `PIB nominal dos ${listaEstado.municipios.length} municípios baianos · referência ${listaEstado.periodo}`
              : 'PIB nominal e PIB per capita estimado por município'}
          </p>
        </div>

        <label className="economia-campo economia-busca-municipio" htmlFor="busca-municipio">
          Buscar município
          <input
            id="busca-municipio"
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Ex.: Salvador, Feira de Santana, Ilhéus..."
          />
        </label>
      </div>

      {listaEstado.carregando ? (
        <p className="economia-status" role="status">
          Carregando municípios da Bahia...
        </p>
      ) : listaEstado.erro ? (
        <p className="economia-status" role="status">
          Não foi possível carregar os municípios. Tente novamente em instantes.
        </p>
      ) : (
        <div className="economia-grade economia-grade--panorama">
          <div className="economia-municipio-detalhe">
            {municipioSelecionado && (
              <>
                <div className="economia-municipio-resumo">
                  <div>
                    <span className="economia-sobretitulo">
                      {municipioSelecionado.posicao}º na Bahia · {formatarNumero(municipioSelecionado.participacao, 2)}% do PIB estadual
                    </span>
                    <h3 className="economia-secao-titulo">{municipioSelecionado.nome}</h3>
                  </div>
                  <div className="economia-municipio-metricas">
                    <div>
                      <span className="economia-legenda">PIB ({municipioSelecionado.periodo})</span>
                      <strong>{pibAtual ? formatarPibCurto(pibAtual.valor) : formatarPibCurto(municipioSelecionado.valor)}</strong>
                    </div>
                    <div>
                      <span className="economia-legenda">PIB per capita estimado</span>
                      <strong>
                        {carregandoDetalhe
                          ? 'Carregando...'
                          : perCapitaAtual
                            ? formatarMoeda(perCapitaAtual.valor)
                            : 'Indisponível'}
                      </strong>
                    </div>
                  </div>
                </div>

                {!carregandoDetalhe && !detalheEstado.erro && detalheEstado.pib.length > 0 && (
                  <p className="economia-sr-only">
                    Série histórica de {municipioSelecionado.nome}: PIB de{' '}
                    {formatarMoeda(detalheEstado.pib[0].valor)} em {detalheEstado.pib[0].periodo} até{' '}
                    {formatarMoeda(pibAtual.valor)} em {pibAtual.periodo}.
                    {perCapitaAtual ? ` PIB per capita estimado em ${perCapitaAtual.periodo}: ${formatarMoeda(perCapitaAtual.valor)}.` : ''}
                  </p>
                )}

                <div className="economia-grafico">
                  {carregandoDetalhe ? (
                    <div className="economia-grafico-status" role="status">Carregando série histórica...</div>
                  ) : detalheEstado.erro ? (
                    <div className="economia-grafico-status" role="status">Não foi possível carregar os dados deste município.</div>
                  ) : (
                    <div aria-hidden="true" style={{ width: '100%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={detalheEstado.pib}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
                          <XAxis dataKey="periodo" tick={EIXO} />
                          <YAxis
                            tick={EIXO}
                            domain={[0, 'auto']}
                            tickFormatter={(v) =>
                              escalaBilhoes
                                ? `${formatarNumero(v / 1e9, 1)} bi`
                                : `${formatarNumero(v / 1e6, 0)} mi`
                            }
                          />
                          <Tooltip
                            contentStyle={TOOLTIP}
                            cursor={{ fill: 'var(--economia-realce)' }}
                            formatter={(v) => [formatarMoeda(v), 'PIB']}
                          />
                          <Bar dataKey="valor" fill={COR} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {!carregandoDetalhe && !detalheEstado.erro && detalheEstado.perCapita.length > 0 && (
                  <div className="economia-grafico">
                    <div aria-hidden="true" style={{ width: '100%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={detalheEstado.perCapita}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--economia-grade)" vertical={false} />
                          <XAxis dataKey="periodo" tick={EIXO} />
                          <YAxis tick={EIXO} width={70} domain={['auto', 'auto']} tickFormatter={(v) => formatarNumero(v, 0)} />
                          <Tooltip contentStyle={TOOLTIP} formatter={(v) => [formatarMoeda(v), 'PIB per capita']} />
                          <Line type="monotone" dataKey="valor" stroke={COR} strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <section className="economia-secao economia-tabela-secao">
            <h3 className="economia-secao-titulo">Ranking municipal</h3>
            <p className="economia-legenda">
              {filtrados.length} de {listaEstado.municipios.length} municípios · clique para ver o histórico
            </p>
            <div className="economia-tabela-rolagem economia-tabela-municipios">
              <table className="economia-tabela">
                <caption className="economia-sr-only">Ranking do PIB dos municípios da Bahia</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Município</th>
                    <th scope="col">PIB</th>
                    <th scope="col">% BA</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setMunicipioId(m.id)}
                      className={`economia-municipio-linha ${m.id === municipioSelecionado?.id ? 'economia-municipio-linha--ativa' : ''}`}
                    >
                      <td>{m.posicao}º</td>
                      <th scope="row">
                        <button
                          type="button"
                          className="economia-municipio-botao"
                          aria-pressed={m.id === municipioSelecionado?.id}
                        >
                          {m.nome}
                        </button>
                      </th>
                      <td>{formatarPibCurto(m.valor)}</td>
                      <td>{formatarNumero(m.participacao, 2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
