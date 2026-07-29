import { describe, expect, it } from 'vitest'
import { ehManual, movimentoDeLancamento, type LancamentoManual } from './lancamento'
import { chaveContraparte, movimentosCaixa } from './movimento'
import { aplicarPisoDados } from './periodo'
import { semCancelados } from '../lib/arvore'

const base: LancamentoManual = {
  id: 'abc-123',
  clienteId: 'cli-1',
  data: '2026-07-15',
  descricao: 'Vendas iFood da semana',
  valorCentavos: 123456,
  natureza: 'receita',
  categoria: '1.01.02',
  origem: 'IFOOD',
  observacao: '',
}

describe('movimentoDeLancamento', () => {
  it('converte para o dialeto do funil: data dd/mm/aaaa, natureza R, id prefixado', () => {
    const m = movimentoDeLancamento(base)
    expect(m.idTitulo).toBe('manual:abc-123')
    expect(m.data).toBe('15/07/2026')
    expect(m.natureza).toBe('R')
    expect(m.categoria).toBe('1.01.02')
    expect(m.valorCentavos).toBe(123456)
    expect(ehManual(m)).toBe(true)
  })

  it('despesa vira P — o critério de saída do resumo', () => {
    expect(movimentoDeLancamento({ ...base, natureza: 'despesa' }).natureza).toBe('P')
  })

  it('entra na DFC: liquidado, valorPago = valor, dataPagamento = data', () => {
    const caixa = movimentosCaixa([movimentoDeLancamento(base)])
    expect(caixa).toHaveLength(1)
    expect(caixa[0]?.valorCentavos).toBe(123456)
    expect(caixa[0]?.dataPagamento).toBe('15/07/2026')
  })

  it('agrupa por contraparte = plataforma ("quanto veio do iFood?")', () => {
    expect(chaveContraparte(movimentoDeLancamento(base))).toBe('IFOOD')
    expect(chaveContraparte(movimentoDeLancamento({ ...base, origem: '  ' }))).toBe('MANUAL')
  })

  it('sobrevive aos filtros do funil: não é cancelado e respeita o piso de dados', () => {
    const m = movimentoDeLancamento(base)
    expect(semCancelados([m])).toHaveLength(1)
    expect(aplicarPisoDados([m], '2026-05-01')).toHaveLength(1)
    expect(aplicarPisoDados([m], '2026-08-01')).toHaveLength(0)
  })
})
