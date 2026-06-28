import { describe, expect, it } from 'vitest'
import { calcular, idsNeutros, semNeutros, type Demonstracao } from './demonstracao'
import type { No } from './modelo'

const demo: Demonstracao = {
  linhas: [
    { id: 'rb', nome: 'Receita', tipo: 'entrada' },
    { id: 'ded', nome: 'Deduções', tipo: 'entrada' },
    { id: 'rl', nome: 'Receita Líquida', tipo: 'subtotal' },
    { id: 'custos', nome: 'Custos', tipo: 'entrada' },
    { id: 'mc', nome: 'Margem de Contribuição', tipo: 'subtotal' },
  ],
  mapa: { g_receita: 'rb', g_ded: 'ded', g_custo: 'custos' },
}

const valor = (linhas: ReturnType<typeof calcular>, id: string) =>
  linhas.find((l) => l.id === id)!.valorCentavos

describe('calcular (DRE/DFC)', () => {
  it('soma os grupos alocados em cada entrada e cascateia os subtotais', () => {
    const totais = new Map([
      ['g_receita', 1000],
      ['g_ded', -100],
      ['g_custo', -300],
    ])
    const r = calcular(demo, totais)
    expect(valor(r, 'rb')).toBe(1000)
    expect(valor(r, 'ded')).toBe(-100)
    expect(valor(r, 'rl')).toBe(900) // 1000 - 100
    expect(valor(r, 'custos')).toBe(-300)
    expect(valor(r, 'mc')).toBe(600) // 900 - 300
  })

  it('grupo sem total entra como 0 (não quebra)', () => {
    const r = calcular(demo, new Map())
    expect(valor(r, 'rl')).toBe(0)
    expect(valor(r, 'mc')).toBe(0)
  })

  it('soma vários grupos na mesma linha', () => {
    const d: Demonstracao = { linhas: demo.linhas, mapa: { a: 'rb', b: 'rb' } }
    const r = calcular(d, new Map([['a', 400], ['b', 600]]))
    expect(valor(r, 'rb')).toBe(1000)
    expect(r.find((l) => l.id === 'rb')!.gruposIds).toEqual(['a', 'b'])
  })
})

describe('Regra Mãe: neutro sempre a conciliar', () => {
  const estrutura: No[] = [
    { id: 'g_receita', nome: 'Receita', paiId: null },
    { id: 'neutros', nome: 'Neutros', paiId: null, meta: { neutra: true } },
  ]

  it('idsNeutros pega só os grupos-raiz neutros', () => {
    expect([...idsNeutros(estrutura)]).toEqual(['neutros'])
  })

  it('semNeutros remove o grupo neutro do mapa (não entra em linha)', () => {
    const d: Demonstracao = { linhas: demo.linhas, mapa: { g_receita: 'rb', neutros: 'rb' } }
    const limpo = semNeutros(d, idsNeutros(estrutura))
    expect(limpo.mapa).toEqual({ g_receita: 'rb' })
    expect(calcular(limpo, new Map([['g_receita', 1000], ['neutros', 9999]])).find((l) => l.id === 'rb')!.valorCentavos).toBe(1000)
  })
})
