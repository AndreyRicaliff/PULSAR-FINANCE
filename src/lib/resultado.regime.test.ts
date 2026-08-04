/**
 * @file Regressão do seletor DRE+DFC (report 2026-08-04): o espelho ignorava o regime do
 * nó, então item marcado "só DRE" (provisões, depreciação) aparecia TAMBÉM na DFC —
 * inflando o fluxo de caixa com valor que nunca passou por caixa.
 */
import { describe, expect, it } from 'vitest'
import type { Movimento } from '@/core/movimento'
import type { Conciliacao } from '@/core/modelo'
import { espelhoEstrutura } from './resultado'

const mov = (categoria: string, valorCentavos: number): Movimento =>
  ({
    idTitulo: `t-${categoria}-${valorCentavos}`,
    categoria,
    valorCentavos,
    data: '01/05/2026',
    natureza: 'P',
    status: 'PAGO',
    liquidado: 'S',
    origem: 'TESTE',
  }) as unknown as Movimento

// Estrutura: um grupo "ambos" com dois subgrupos — um só-DRE (provisão) e um normal.
const conc: Conciliacao = {
  estrutura: [
    { id: 'pessoal', nome: 'Despesas de Pessoal', paiId: null, meta: { regime: 'ambos' } },
    { id: 'salarios', nome: 'Salários', paiId: 'pessoal' },
    { id: 'provisao', nome: 'Provisão de Férias', paiId: 'pessoal', meta: { regime: 'dre' } },
    { id: 'restituicao', nome: 'Restituição de Impostos', paiId: null, meta: { regime: 'dfc' } },
  ],
  mapa: { '2.01': 'salarios', '2.02': 'provisao', '1.09': 'restituicao' },
} as unknown as Conciliacao

const movs = [mov('2.01', 100_000), mov('2.02', 30_000), mov('1.09', 50_000)]

const subs = (gs: ReturnType<typeof espelhoEstrutura>, grupoId: string) =>
  gs.find((g) => g.id === grupoId)?.subgrupos.map((s) => s.id) ?? []

describe('espelhoEstrutura respeita o regime do nó', () => {
  it('subgrupo "só DRE" NÃO aparece na DFC', () => {
    expect(subs(espelhoEstrutura(movs, conc, 'dfc'), 'pessoal')).not.toContain('provisao')
  })

  it('...mas aparece na DRE', () => {
    expect(subs(espelhoEstrutura(movs, conc, 'dre'), 'pessoal')).toContain('provisao')
  })

  it('grupo "só DFC" some inteiro da DRE', () => {
    const ids = espelhoEstrutura(movs, conc, 'dre').map((g) => g.id)
    expect(ids).not.toContain('restituicao')
    expect(espelhoEstrutura(movs, conc, 'dfc').map((g) => g.id)).toContain('restituicao')
  })

  it('sem tipo, o espelho é completo (visão de estrutura da Matriz)', () => {
    const ids = espelhoEstrutura(movs, conc).map((g) => g.id)
    expect(ids).toContain('restituicao')
    expect(subs(espelhoEstrutura(movs, conc), 'pessoal')).toContain('provisao')
  })

  it('o total do grupo na DFC não soma o subgrupo só-DRE', () => {
    const g = espelhoEstrutura(movs, conc, 'dfc').find((x) => x.id === 'pessoal')
    // 100.000 (salários) — a provisão de 30.000 fica de fora do caixa.
    expect(Math.abs(g?.totalCentavos ?? 0)).toBe(100_000)
  })
})
