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
  // O caso REAL de produção: neutro é subgrupo de um grupo comum (57 assim em 06/08).
  { id: 'movimentacao', nome: 'Movimentação Financeira', paiId: null },
  { id: 'sub-d0', nome: 'Aplicação Automática D+0', paiId: 'movimentacao', meta: { regime: 'neutro', neutra: true } },
]

const TOTAIS = new Map([
  ['receita', 100_000],
  ['transf', 500_000],
  ['aporte', 250_000],
  ['sub-transf', 90_000],
  ['sub-d0', 33_000],
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
    expect(p.map((x) => x.id)).toContain('transf')
    expect(p.find((x) => x.id === 'transf')?.valorCentavos).toBe(500_000)
  })

  /**
   * Regressão do achado da revisão de 06/08: `partidasNeutras` só listava raiz, mas em
   * produção 57 dos 72 nós neutros são SUBGRUPO — e como `entraNaDemonstracao` passou a
   * barrá-los, eles sumiriam de vez. O oposto exato do que foi pedido.
   */
  it('SUBGRUPO neutro sob grupo comum aparece — é o caso real de produção', () => {
    const p = partidasNeutras(ESTRUTURA, TOTAIS)
    const d0 = p.find((x) => x.id === 'sub-d0')
    expect(d0).toBeDefined()
    expect(d0?.valorCentavos).toBe(33_000)
  })

  it('subgrupo neutro é qualificado pelo pai (dois grupos podem ter subgrupo homônimo)', () => {
    expect(partidasNeutras(ESTRUTURA, TOTAIS).find((x) => x.id === 'sub-d0')?.nome).toBe(
      'Movimentação Financeira · Aplicação Automática D+0',
    )
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

  it('subgrupo sob raiz JÁ neutra não repete — o total do pai já o contém', () => {
    expect(partidasNeutras(ESTRUTURA, TOTAIS).map((p) => p.id)).not.toContain('sub-transf')
  })

  it('a soma exibida não conta o mesmo dinheiro duas vezes', () => {
    const p = partidasNeutras(ESTRUTURA, TOTAIS)
    // transf(500k) + aporte(250k) + sub-d0(33k) — sub-transf está DENTRO de transf.
    expect(p.reduce((s, x) => s + x.valorCentavos, 0)).toBe(783_000)
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
