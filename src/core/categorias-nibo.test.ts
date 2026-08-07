import { describe, expect, it } from 'vitest'
import {
  ajustarNaturezaAgrupadoras,
  completarCategoriasComSchedules,
  mapearCategoriasNibo,
  naturezaNibo,
} from '../../supabase/functions/sync-omie/categorias-nibo.ts'

// O módulo da edge é @ts-nocheck (regime Deno) — tipo local só para o teste não cair em any.
type Cat = {
  codigo: string
  descricao: string
  natureza: string
  paiCodigo: string | null
  agrupadora: boolean
  ativa: boolean
  entraNoDre: boolean
}

describe('naturezaNibo', () => {
  it('mapeia o sinal Credit/Debit do schedule', () => {
    expect(naturezaNibo('Credit')).toBe('receita')
    expect(naturezaNibo('Debit')).toBe('despesa')
  })

  it('sinal ausente ou desconhecido cai em outra', () => {
    expect(naturezaNibo(undefined)).toBe('outra')
    expect(naturezaNibo('')).toBe('outra')
    expect(naturezaNibo('Transfer')).toBe('outra')
  })
})

describe('completarCategoriasComSchedules', () => {
  // Shape REAL do rateio (payload conferido com apitoken em 2026-08-07): s.categories[]
  // traz `type` PRÓPRIO 'in'/'out' — a natureza sai dele; o s.type (Credit/Debit) do
  // schedule é só o fallback defensivo caso o campo suma.
  const schedules = [
    {
      type: 'Debit',
      categories: [{ categoryId: 'guid-taxa', categoryName: 'Taxas Antigas', parentId: 'guid-pai', parent: 'Despesas Gerais', type: 'out', value: -120 }],
    },
    { type: 'Credit', categories: [{ categoryId: 'guid-venda', categoryName: 'Vendas Balcão', type: 'in', value: 300 }] },
  ]

  it('arquivada recuperada usa o type do PRÓPRIO rateio (in/out)', () => {
    const out: Cat[] = completarCategoriasComSchedules([], schedules)
    const taxa = out.find((c) => c.codigo === 'guid-taxa')
    const venda = out.find((c) => c.codigo === 'guid-venda')
    expect(taxa?.natureza).toBe('despesa')
    expect(venda?.natureza).toBe('receita')
  })

  it('rateio SEM type cai no sinal do schedule, nunca em outra (blindagem auditoria 07/08)', () => {
    const out: Cat[] = completarCategoriasComSchedules([], [
      { type: 'Debit', categories: [{ categoryId: 'guid-x', categoryName: 'Sem Type', parentId: 'guid-pai-x', parent: 'Grupo X' }] },
    ])
    expect(out.find((c) => c.codigo === 'guid-x')?.natureza).toBe('despesa')
    expect(out.find((c) => c.codigo === 'guid-pai-x')?.natureza).toBe('despesa')
  })

  it('agrupadora-pai sintetizada herda a natureza do rateio', () => {
    const out: Cat[] = completarCategoriasComSchedules([], schedules)
    const pai = out.find((c) => c.codigo === 'guid-pai')
    expect(pai?.agrupadora).toBe(true)
    expect(pai?.natureza).toBe('despesa')
  })

  it('não recria categoria que já veio de /categories', () => {
    const existente: Cat = {
      codigo: 'guid-taxa', descricao: 'Taxas', natureza: 'despesa',
      paiCodigo: null, agrupadora: false, ativa: true, entraNoDre: true,
    }
    const out: Cat[] = completarCategoriasComSchedules([existente], schedules)
    expect(out.filter((c) => c.codigo === 'guid-taxa')).toEqual([existente])
  })
})

describe('mapearCategoriasNibo', () => {
  it('sintetiza grupo e subgrupo do plano de 3 níveis', () => {
    const out: Cat[] = mapearCategoriasNibo([
      { id: 'c1', name: 'Aluguel', type: 'Out', subgroupId: 's1', subgroupName: 'Ocupação', group: { id: 'g1', name: 'Despesas Fixas' } },
    ])
    expect(out.map((c) => [c.codigo, c.agrupadora, c.paiCodigo])).toEqual([
      ['g1', true, null],
      ['s1', true, 'g1'],
      ['c1', false, 's1'],
    ])
    expect(out.every((c) => c.natureza === 'despesa')).toBe(true)
  })
})

describe('ajustarNaturezaAgrupadoras', () => {
  it('agrupadora assume a natureza predominante das filhas analíticas', () => {
    const cat = (codigo: string, natureza: string, paiCodigo: string | null, agrupadora = false): Cat =>
      ({ codigo, descricao: codigo, natureza, paiCodigo, agrupadora, ativa: true, entraNoDre: !agrupadora })
    const out: Cat[] = ajustarNaturezaAgrupadoras([
      cat('g1', 'despesa', null, true),
      cat('c1', 'receita', 'g1'),
      cat('c2', 'receita', 'g1'),
      cat('c3', 'despesa', 'g1'),
    ])
    expect(out.find((c) => c.codigo === 'g1')?.natureza).toBe('receita')
  })
})
