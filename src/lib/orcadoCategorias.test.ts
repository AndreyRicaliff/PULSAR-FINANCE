import { describe, expect, it } from 'vitest'
import { agregarOrcadoPorCategoria, dentroDoOrcado, pctExecucao } from './orcadoCategorias'

const MESES = {
  '2026-01': [
    { categoria: '1.01.01', previstoCentavos: 50_000, realizadoCentavos: 65_000 },
    { categoria: '2.05.01', previstoCentavos: 10_000, realizadoCentavos: 8_000 },
    { categoria: '0.01', previstoCentavos: 5_000, realizadoCentavos: 5_000 }, // transferência: fora
  ],
  '2026-02': [
    { categoria: '1.01.01', previstoCentavos: 40_000, realizadoCentavos: 30_000 },
    { categoria: '1.02.01', previstoCentavos: 0, realizadoCentavos: 12_000 }, // sem orçado, com atual
    { categoria: '2.09.99', previstoCentavos: 0, realizadoCentavos: 0 }, // zerada: some
  ],
}

describe('agregarOrcadoPorCategoria', () => {
  it('soma por categoria só nos meses do recorte e separa receitas × despesas', () => {
    const r = agregarOrcadoPorCategoria(MESES, ['2026-01', '2026-02'])
    expect(r.receitas.linhas).toEqual([
      { codigo: '1.01.01', previstoCentavos: 90_000, realizadoCentavos: 95_000 },
      { codigo: '1.02.01', previstoCentavos: 0, realizadoCentavos: 12_000 },
    ])
    expect(r.receitas.previstoCentavos).toBe(90_000)
    expect(r.receitas.realizadoCentavos).toBe(107_000)
    expect(r.despesas.linhas).toEqual([{ codigo: '2.05.01', previstoCentavos: 10_000, realizadoCentavos: 8_000 }])
  })

  it('recorte de um mês só considera aquele mês; linha toda-zerada não aparece', () => {
    const r = agregarOrcadoPorCategoria(MESES, ['2026-02'])
    expect(r.receitas.linhas.map((l) => l.codigo)).toEqual(['1.01.01', '1.02.01'])
    expect(r.receitas.linhas[0]!.previstoCentavos).toBe(40_000)
    expect(r.despesas.linhas).toEqual([])
  })
})

describe('pctExecucao / dentroDoOrcado', () => {
  it('sem base de orçado (0 ou negativo) devolve null — nunca inventa 100%', () => {
    expect(pctExecucao(12_000, 0)).toBeNull()
    expect(pctExecucao(12_000, -5_000)).toBeNull()
    expect(dentroDoOrcado('R', null)).toBeNull()
  })

  it('receita no orçado ou acima é bom; despesa acima é ruim', () => {
    expect(pctExecucao(95_000, 90_000)).toBe(106)
    expect(dentroDoOrcado('R', 106)).toBe(true)
    expect(dentroDoOrcado('R', 92)).toBe(false)
    expect(dentroDoOrcado('P', 80)).toBe(true)
    expect(dentroDoOrcado('P', 102)).toBe(false)
  })
})
