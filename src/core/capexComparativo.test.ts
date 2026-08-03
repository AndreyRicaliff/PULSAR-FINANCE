import { describe, expect, it } from 'vitest'
import { alinhar, eixoContinuo, projetarCapex, serieCapex, serieLinha } from './capexComparativo'
import type { LinhaCalc } from './demonstracao'

const linha = (id: string, valorCentavos: number): LinhaCalc => ({ id, nome: id, tipo: 'entrada', valorCentavos, gruposIds: [] })

describe('eixoContinuo', () => {
  it('preenche os meses ausentes entre o primeiro e o último, cruzando a virada de ano', () => {
    expect(eixoContinuo(['2025-11', '2026-02'])).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })
  it('devolve vazio sem chaves', () => {
    expect(eixoContinuo([])).toEqual([])
  })
})

describe('serieCapex', () => {
  const porMes = [
    { mes: '2026-01', investimentoCentavos: 100_00, manutencaoCentavos: 40_00 },
    { mes: '2026-03', investimentoCentavos: 0, manutencaoCentavos: 25_00 },
  ]
  it('soma os baldes no total e separa por balde', () => {
    expect(serieCapex(porMes, 'total').get('2026-01')).toBe(140_00)
    expect(serieCapex(porMes, 'investimento').get('2026-03')).toBe(0)
    expect(serieCapex(porMes, 'manutencao').get('2026-03')).toBe(25_00)
  })
})

describe('serieLinha + alinhar', () => {
  it('extrai a linha pedida por mês e alinha com gap-fill 0 (fonte existe e diz zero)', () => {
    const meses = [
      { mes: '2026-01', linhas: [linha('dfc_inv', -80_00), linha('dfc_op', 10_00)] },
      { mes: '2026-02', linhas: [linha('dfc_inv', -20_00)] },
    ]
    const s = serieLinha(meses, 'dfc_inv')
    expect(alinhar(['2026-01', '2026-02', '2026-03'], s)).toEqual([-80_00, -20_00, 0])
  })
  it('null marca mês SEM fonte (orçado não sincronizado ≠ orçado zero)', () => {
    expect(alinhar(['2026-01', '2026-02'], new Map([['2026-01', 5_00]]), null)).toEqual([5_00, null])
  })
})

describe('projetarCapex', () => {
  it('linear estende a tendência, ancora no último mês ativo e nomeia os seguintes', () => {
    const p = projetarCapex(['2026-01', '2026-02', '2026-03'], [100, 200, 300], 'linear', 2)
    expect(p.ancora).toBe('2026-03')
    expect(p.meses).toEqual(['2026-04', '2026-05'])
    expect(p.valores).toEqual([400, 500])
  })
  it('média móvel usa os últimos 3 valores', () => {
    const p = projetarCapex(['2026-01', '2026-02', '2026-03'], [90, 120, 150], 'media-movel', 1)
    expect(p.valores).toEqual([120])
  })
  it('zeros de gap-fill na cauda NÃO entram no ajuste — a âncora recua pro último mês ativo', () => {
    const p = projetarCapex(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'], [90, 120, 150, 0, 0], 'media-movel', 2)
    expect(p.ancora).toBe('2026-03')
    expect(p.meses).toEqual(['2026-04', '2026-05'])
    expect(p.valores).toEqual([120, 120]) // média de 90/120/150 — não de 150/0/0
  })
  it('zeros à frente também ficam fora do ajuste', () => {
    const p = projetarCapex(['2026-01', '2026-02', '2026-03'], [0, 100, 200], 'linear', 1)
    expect(p.valores).toEqual([300])
  })
  it('sem horizonte, sem atividade ou com base curta devolve vazio (projeção nunca é fabricada)', () => {
    expect(projetarCapex(['2026-01'], [100], 'linear', 3).meses).toEqual([])
    expect(projetarCapex(['2026-01', '2026-02'], [1, 2], 'linear', 0).meses).toEqual([])
    expect(projetarCapex(['2026-01', '2026-02'], [0, 0], 'linear', 3).meses).toEqual([])
  })
})
