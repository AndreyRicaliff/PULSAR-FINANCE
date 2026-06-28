import { describe, expect, it } from 'vitest'
import { arvorePorGrupo, totaisEfetivos } from './classes'
import type { Categoria } from './categoria'
import { LINHA_FORA, type Demonstracao } from './demonstracao'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'

const cat = (codigo: string, paiCodigo: string | null, agrupadora: boolean): Categoria => ({
  codigo,
  descricao: codigo,
  natureza: 'receita',
  paiCodigo,
  agrupadora,
  ativa: true,
  entraNoDre: true,
})

const categorias: Categoria[] = [
  cat('1', null, true),
  cat('1.01', '1', true), // classe (agrupadora)
  cat('1.01.01', '1.01', false), // movimentação (analítica)
  cat('1.01.02', '1.01', false),
]

const conc: Conciliacao = {
  estrutura: [
    { id: 'g_rec', nome: 'Receita', paiId: null },
    { id: 's_vendas', nome: 'Vendas', paiId: 'g_rec' },
  ],
  mapa: { '1.01.01': 's_vendas', '1.01.02': 's_vendas' },
}

const mov = (categoria: string, valorCentavos: number): Movimento =>
  ({ categoria, valorCentavos, natureza: 'R' }) as Movimento

describe('arvorePorGrupo (grupo → subgrupo → classe)', () => {
  it('agrupa por subgrupo e resolve a classe pela agrupadora ancestral', () => {
    const arvore = arvorePorGrupo([mov('1.01.01', 1000), mov('1.01.02', 500)], conc, categorias)
    const subs = arvore.get('g_rec')!
    expect(subs).toHaveLength(1)
    expect(subs[0]!.id).toBe('s_vendas')
    expect(subs[0]!.totalCentavos).toBe(1500)
    expect(subs[0]!.classes).toHaveLength(1)
    expect(subs[0]!.classes[0]!.codigo).toBe('1.01') // a classe é a agrupadora, não a folha
    expect(subs[0]!.classes[0]!.totalCentavos).toBe(1500)
  })
})

describe('totaisEfetivos (override classe > subgrupo > grupo)', () => {
  const linhas = [{ id: 'rb', nome: 'Receita', tipo: 'entrada' as const }]
  const movs = [mov('1.01.01', 1000), mov('1.01.02', 500)]

  it('sem override: tudo cai na chave do grupo', () => {
    const demo: Demonstracao = { linhas, mapa: { g_rec: 'rb' } }
    const ef = totaisEfetivos(movs, conc, categorias, demo, 'dre')
    expect(ef.totalPorChave.get('g_rec')).toBe(1500)
    expect(ef.mapaEfetivo['g_rec']).toBe('rb')
  })

  it('override por subgrupo manda o subgrupo para a linha escolhida', () => {
    const demo: Demonstracao = { linhas, mapa: { g_rec: 'rb' }, mapaSub: { s_vendas: 'outra' } }
    const ef = totaisEfetivos(movs, conc, categorias, demo, 'dre')
    expect(ef.totalPorChave.get('sub:s_vendas')).toBe(1500)
    expect(ef.mapaEfetivo['sub:s_vendas']).toBe('outra')
    expect(ef.totalPorChave.get('g_rec')).toBeUndefined()
  })

  it('override por classe tem precedência sobre subgrupo', () => {
    const demo: Demonstracao = { linhas, mapa: { g_rec: 'rb' }, mapaSub: { s_vendas: 'x' }, mapaClasse: { '1.01': 'y' } }
    const ef = totaisEfetivos(movs, conc, categorias, demo, 'dre')
    expect(ef.totalPorChave.get('cls:1.01')).toBe(1500)
    expect(ef.mapaEfetivo['cls:1.01']).toBe('y')
    expect(ef.totalPorChave.get('sub:s_vendas')).toBeUndefined()
  })

  it('LINHA_FORA remove a classe da demonstração (não cai em nenhuma linha)', () => {
    const demo: Demonstracao = { linhas, mapa: { g_rec: 'rb' }, mapaClasse: { '1.01': LINHA_FORA } }
    const ef = totaisEfetivos(movs, conc, categorias, demo, 'dre')
    expect(ef.totalPorChave.get('cls:1.01')).toBe(1500) // valor existe…
    expect(ef.mapaEfetivo['cls:1.01']).toBeUndefined() // …mas não entra em linha nenhuma
  })
})

describe('regime do grupo (DRE/DFC)', () => {
  const linhas = [{ id: 'rb', nome: 'Receita', tipo: 'entrada' as const }]
  const concDfc: Conciliacao = {
    estrutura: [
      { id: 'g_rec', nome: 'Receita', paiId: null, meta: { regime: 'dfc' } },
      { id: 's_vendas', nome: 'Vendas', paiId: 'g_rec' },
    ],
    mapa: { '1.01.01': 's_vendas' },
  }
  const m1 = [mov('1.01.01', 1000)]
  const demo: Demonstracao = { linhas, mapa: { g_rec: 'rb' } }

  it('grupo "só DFC" não entra na DRE, mas entra na DFC', () => {
    expect(totaisEfetivos(m1, concDfc, categorias, demo, 'dre').totalPorChave.size).toBe(0)
    expect(totaisEfetivos(m1, concDfc, categorias, demo, 'dfc').totalPorChave.get('g_rec')).toBe(1000)
  })
})

describe('regime do subgrupo (DRE/DFC)', () => {
  const linhas = [{ id: 'rb', nome: 'Receita', tipo: 'entrada' as const }]
  // Grupo entra em ambos; subgrupo restrito a DFC.
  const concSub: Conciliacao = {
    estrutura: [
      { id: 'g_rec', nome: 'Receita', paiId: null },
      { id: 's_vendas', nome: 'Vendas', paiId: 'g_rec', meta: { regime: 'dfc' } },
    ],
    mapa: { '1.01.01': 's_vendas' },
  }
  const m1 = [mov('1.01.01', 1000)]
  const demo: Demonstracao = { linhas, mapa: { g_rec: 'rb' } }

  it('subgrupo "só DFC" sai da DRE mesmo com grupo em ambos', () => {
    expect(totaisEfetivos(m1, concSub, categorias, demo, 'dre').totalPorChave.size).toBe(0)
    expect(totaisEfetivos(m1, concSub, categorias, demo, 'dfc').totalPorChave.get('g_rec')).toBe(1000)
  })
})

describe('override redundante (mesma linha do pai) não vira chip', () => {
  const linhasR = [{ id: 'rb', nome: 'Receita', tipo: 'entrada' as const }]
  it('classe apontando para a MESMA linha do grupo fica no grupo (sem cls:)', () => {
    const demo: Demonstracao = { linhas: linhasR, mapa: { g_rec: 'rb' }, mapaClasse: { '1.01': 'rb' } }
    const ef = totaisEfetivos([mov('1.01.01', 1000)], conc, categorias, demo, 'dre')
    expect(ef.totalPorChave.get('cls:1.01')).toBeUndefined() // não cria chave própria
    expect(ef.totalPorChave.get('g_rec')).toBe(1000) // fica no grupo
  })
})
