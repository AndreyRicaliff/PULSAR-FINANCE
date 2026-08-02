import { describe, expect, it } from 'vitest'
import { agregarOrcadoPorCategoria, dentroDoOrcado, matrizOrcado, pctExecucao } from './orcadoCategorias'

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

describe('matrizOrcado (pivot categoria × mês)', () => {
  const MESES = {
    '2026-01': [
      { categoria: '1.01.01', previstoCentavos: 100_000, realizadoCentavos: 90_000 },
      { categoria: '2.05.01', previstoCentavos: 40_000, realizadoCentavos: 45_000 },
      { categoria: '3.01', previstoCentavos: 10_000, realizadoCentavos: 10_000 }, // transferência: fora
    ],
    '2026-02': [{ categoria: '1.01.01', previstoCentavos: 120_000, realizadoCentavos: 0 }],
    '2026-03': [{ categoria: '1.01.01', previstoCentavos: 0, realizadoCentavos: 0 }], // zerado: mês fora
  }

  it('pivota por mês, separa lados pelo prefixo e ignora mês todo-zerado', () => {
    const m = matrizOrcado(MESES, ['2026-01', '2026-02', '2026-03'])
    expect(m.meses).toEqual(['2026-01', '2026-02'])
    expect(m.receitas).toHaveLength(1)
    expect(m.receitas[0]!.codigo).toBe('1.01.01')
    expect(m.receitas[0]!.porMes.get('2026-01')).toEqual({ previstoCentavos: 100_000, realizadoCentavos: 90_000 })
    expect(m.receitas[0]!.totalPrevistoCentavos).toBe(220_000)
    expect(m.despesas[0]!.porMes.get('2026-02')).toBeUndefined()
  })

  it('recorte de um mês limita colunas e totais', () => {
    const m = matrizOrcado(MESES, ['2026-02'])
    expect(m.meses).toEqual(['2026-02'])
    expect(m.receitas[0]!.totalPrevistoCentavos).toBe(120_000)
    expect(m.despesas).toHaveLength(0)
  })
})
