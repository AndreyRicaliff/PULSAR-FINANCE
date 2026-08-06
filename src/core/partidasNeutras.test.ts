/**
 * @file Contrato do regime 'neutro' (pedido 06/08): "todos os neutros devem sempre aparecer
 * nos regimes mas sem interferir nos valores". Os dois lados precisam de trava — aparecer é
 * fácil de perder num refactor, e não-somar é fácil de quebrar sem ninguém notar.
 */
import { describe, expect, it } from 'vitest'
import { calcular, partidasNeutras, type Demonstracao } from './demonstracao'
import { entraNaDemonstracao, etiquetasContabeis, type No } from './modelo'

const ESTRUTURA: readonly No[] = [
  { id: 'receita', nome: 'Receita Bruta', paiId: null, meta: { papelDRE: 'receita_bruta' } },
  { id: 'transf', nome: 'Transferências entre Contas', paiId: null, meta: { regime: 'neutro', neutra: true } },
  { id: 'aporte', nome: 'Aporte de Sócio', paiId: null, meta: { regime: 'neutro', neutra: true } },
  { id: 'sub-transf', nome: 'Sub de transferência', paiId: 'transf', meta: { neutra: true } },
]

const TOTAIS = new Map([
  ['receita', 100_000],
  ['transf', 500_000],
  ['aporte', 250_000],
  ['sub-transf', 90_000],
])

const DEMO: Demonstracao = {
  linhas: [
    { id: 'dre_receita', rotulo: 'Receita', tipo: 'entrada' },
    { id: 'dre_liquido', rotulo: 'Resultado', tipo: 'subtotal' },
  ],
  mapa: { receita: 'dre_receita' },
} as unknown as Demonstracao

describe('regime neutro', () => {
  it('APARECE: os grupos neutros são listados com o valor do período', () => {
    const p = partidasNeutras(ESTRUTURA, TOTAIS)
    expect(p.map((x) => x.nome)).toEqual(['Transferências entre Contas', 'Aporte de Sócio'])
    expect(p[0]?.valorCentavos).toBe(500_000)
  })

  it('NÃO SOMA: o total da demonstração ignora os neutros', () => {
    const linhas = calcular(DEMO, TOTAIS)
    expect(linhas.find((l) => l.id === 'dre_liquido')?.valorCentavos).toBe(100_000)
  })

  it('nem por regime nem por Regra Mãe o neutro entra na DRE/DFC', () => {
    const meta = { regime: 'neutro' as const, neutra: true }
    expect(entraNaDemonstracao(meta, 'dre')).toBe(false)
    expect(entraNaDemonstracao(meta, 'dfc')).toBe(false)
  })

  // Defesa contra estado contraditório: se um doc antigo tiver neutra=true com regime 'dre',
  // vale NÃO SOMAR — número errado é pior que linha faltando.
  it('meta contraditória (neutra + regime dre) não soma', () => {
    expect(entraNaDemonstracao({ regime: 'dre', neutra: true }, 'dre')).toBe(false)
  })

  it('subgrupo neutro não vira partida própria — soma dentro do seu grupo', () => {
    expect(partidasNeutras(ESTRUTURA, TOTAIS).map((p) => p.id)).not.toContain('sub-transf')
  })

  it('sem neutros na estrutura, nada é exibido', () => {
    expect(partidasNeutras([ESTRUTURA[0]!], TOTAIS)).toEqual([])
  })

  it('grupo neutro sem movimento no período aparece zerado, não some', () => {
    expect(partidasNeutras(ESTRUTURA, new Map())[0]).toEqual({
      id: 'transf',
      nome: 'Transferências entre Contas',
      valorCentavos: 0,
    })
  })

  it('a etiqueta do nó continua dizendo que é neutro', () => {
    expect(etiquetasContabeis({ regime: 'neutro', neutra: true })).toEqual(['Neutra · Regra Mãe'])
  })
})
