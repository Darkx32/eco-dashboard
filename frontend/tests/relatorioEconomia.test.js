import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularRelatorio, formatarVariacaoRelatorio, gerarResumoRelatorio } from '../src/utils/relatorioEconomia.js'

const pib = { nome: 'PIB do Brasil', unidade: 'R$', frequencia: 'Anual' }
const desemprego = { nome: 'Taxa de desemprego', unidade: '%', frequencia: 'Trimestre móvel' }

test('filtra e ordena a comparação sem alterar a série original', () => {
  const dados = [{ periodo: '2025', valor: 150 }, { periodo: '2023', valor: 100 }, { periodo: '2024', valor: 120 }]
  const original = structuredClone(dados)
  const relatorio = calcularRelatorio(dados, '2024', '2025')
  assert.equal(relatorio.inicial.valor, 120)
  assert.equal(relatorio.final.valor, 150)
  assert.equal(relatorio.variacao, 25)
  assert.equal(formatarVariacaoRelatorio(relatorio, 'R$'), '+25,00%')
  assert.match(gerarResumoRelatorio(pib, relatorio), /Alta nominal de 25,00%/)
  assert.deepEqual(dados, original)
})

test('compara taxas em pontos percentuais e mantém o trimestre móvel', () => {
  const relatorio = calcularRelatorio([{ periodo: '202608', valor: 6.2 }, { periodo: '202609', valor: 5.2 }])
  assert.equal(formatarVariacaoRelatorio(relatorio, '%'), '-1,00 p.p.')
  const resumo = gerarResumoRelatorio(desemprego, relatorio)
  assert.match(resumo, /Queda de 1,00 ponto percentual\./)
  assert.match(resumo, /jun–ago\/2026/)
  assert.match(resumo, /jul–set\/2026/)
})

test('IPCA usa diferença entre taxas, sem somar a inflação de 12 meses', () => {
  const relatorio = calcularRelatorio([{ periodo: '202601', valor: 4 }, { periodo: '202602', valor: 6 }])
  assert.equal(formatarVariacaoRelatorio(relatorio, '%'), '+2,00 p.p.')
})

test('empates preservam todas as referências do maior e do menor valor', () => {
  const relatorio = calcularRelatorio([
    { periodo: '202501', valor: 5 }, { periodo: '202502', valor: 6 },
    { periodo: '202503', valor: 6 }, { periodo: '202504', valor: 5 },
  ])
  assert.deepEqual(relatorio.menor.periodos, ['202501', '202504'])
  assert.deepEqual(relatorio.maior.periodos, ['202502', '202503'])
  assert.match(gerarResumoRelatorio(desemprego, relatorio), /Sem variação/)
})

test('um registro não gera uma variação artificial de zero', () => {
  const relatorio = calcularRelatorio([{ periodo: '2025', valor: 10 }])
  assert.equal(relatorio.comparavel, false)
  assert.equal(relatorio.variacao, null)
  assert.equal(relatorio.diferenca, null)
  assert.match(gerarResumoRelatorio(pib, relatorio), /Um registro no período/)
})

test('base zero não causa divisão por zero ou percentual infinito', () => {
  const relatorio = calcularRelatorio([{ periodo: '2024', valor: 0 }, { periodo: '2025', valor: 100 }])
  assert.equal(relatorio.variacao, null)
  assert.equal(formatarVariacaoRelatorio(relatorio, 'R$'), 'Não calculável')
  assert.match(gerarResumoRelatorio(pib, relatorio), /valor inicial zero/)
  assert.equal(formatarVariacaoRelatorio(relatorio, '%'), '+100,00 p.p.')
})

test('valores indisponíveis são preservados na tabela e excluídos dos cálculos', () => {
  const relatorio = calcularRelatorio([
    { periodo: '2023', valor: NaN }, { periodo: '2024', valor: 20 },
    { periodo: '2025', valor: 30 }, { periodo: '2026', valor: Infinity },
  ])
  assert.equal(relatorio.registros.length, 4)
  assert.equal(relatorio.indisponiveis, 2)
  assert.equal(relatorio.inicial.periodo, '2024')
  assert.equal(relatorio.final.periodo, '2025')
  assert.equal(relatorio.maior.valor, 30)
})

test('série vazia, sem números ou fora do filtro não gera relatório', () => {
  assert.equal(calcularRelatorio([]), null)
  assert.equal(calcularRelatorio([{ periodo: '2025', valor: NaN }]), null)
  assert.equal(calcularRelatorio([{ periodo: '2025', valor: 1 }], '2026'), null)
})

test('formatação evita zero negativo nas diferenças entre taxas', () => {
  const relatorio = calcularRelatorio([{ periodo: '202601', valor: 5 }, { periodo: '202602', valor: 4.9999999 }])
  assert.equal(formatarVariacaoRelatorio(relatorio, '%'), '0,00 p.p.')
})
