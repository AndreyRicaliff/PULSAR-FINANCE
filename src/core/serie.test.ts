import { describe, expect, it } from 'vitest'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import { crescimento, projetar, serieMensal, type PontoSerie } from './serie'

const conc: Conciliacao = {
  estrutura: [{ id: 'g1', nome: 'Operacional', paiId: null }],
  mapa: { '1.01': 'g1' },
}

function mov(p: Partial<Movimento>): Movimento {
  return {
    idTitulo: '1', categoria: '1.01', valorCentavos: 100, campoValor: 'valor', data: '',
    dataEmissao: '', dataRegistro: '', dataPrevisao: '', dataVencimento: '', status: '',
    liquidado: '', documento: '', parcela: '', contraparte: '', contraparteCodigo: '', natureza: 'R',
    grupo: '', origem: '', tipoDocumento: '', operacao: '', contaCorrente: '', jurosCentavos: 0,
    multaCentavos: 0, descontoCentavos: 0, valorPagoCentavos: 0, valorAbertoCentavos: 0, ...p,
  }
}

describe('serieMensal', () => {
  it('agrega por mês e preenche meses vazios (contínua)', () => {
    const movs = [
      mov({ dataEmissao: '10/01/2026', natureza: 'R', valorCentavos: 100 }),
      mov({ dataEmissao: '10/03/2026', natureza: 'R', valorCentavos: 300 }),
    ]
    const s = serieMensal(movs, conc, 'competencia')
    expect(s.map((p) => p.mes)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(s[1]).toMatchObject({ entrada: 0, saida: 0, saldo: 0 })
    expect(s[2]).toMatchObject({ entrada: 300, saldo: 300 })
  })

  it('separa entrada e saída pela natureza', () => {
    const movs = [
      mov({ dataEmissao: '10/01/2026', natureza: 'R', valorCentavos: 500 }),
      mov({ dataEmissao: '15/01/2026', natureza: 'P', valorCentavos: 200 }),
    ]
    const s = serieMensal(movs, conc, 'competencia')
    expect(s[0]).toMatchObject({ entrada: 500, saida: 200, saldo: 300 })
  })
})

describe('projetar', () => {
  const serie: PontoSerie[] = serieMensal(
    [
      mov({ dataEmissao: '10/01/2026', valorCentavos: 100 }),
      mov({ dataEmissao: '10/02/2026', valorCentavos: 200 }),
      mov({ dataEmissao: '10/03/2026', valorCentavos: 300 }),
    ],
    conc,
    'competencia',
  )

  it('linear segue a tendência de alta', () => {
    const p = projetar(serie, 'linear', 2)
    expect(p).toHaveLength(2)
    expect(p.every((x) => x.projetado)).toBe(true)
    expect(p[0]!.saldo).toBeGreaterThan(300)
    expect(p[0]!.mes).toBe('2026-04')
  })

  it('média móvel projeta plano na média recente', () => {
    const p = projetar(serie, 'media-movel', 2)
    expect(p[0]!.saldo).toBe(200) // média de 100,200,300
    expect(p[1]!.saldo).toBe(200)
  })

  it('série curta não projeta', () => {
    expect(projetar(serie.slice(0, 1), 'linear', 3)).toEqual([])
  })
})

describe('crescimento', () => {
  const ponto = (mes: string, entrada: number, projetado = false) => ({
    mes, rotulo: mes.slice(5), entrada, saida: 0, saldo: entrada, projetado,
  })

  it('MoM = último vs anterior; projeção fica fora', () => {
    const serie = [ponto('2026-04', 100), ponto('2026-05', 150), ponto('2026-06', 999, true)]
    expect(crescimento(serie, 'entrada').mom).toBeCloseTo(0.5)
  })
  it('YoY usa o mesmo mês do ano anterior quando existe', () => {
    const serie = [ponto('2025-05', 200), ponto('2026-04', 100), ponto('2026-05', 300)]
    expect(crescimento(serie, 'entrada').yoy).toBeCloseTo(0.5)
  })
  it('sem base → null (nunca inventa percentual)', () => {
    const r = crescimento([ponto('2026-05', 100)], 'entrada')
    expect(r.mom).toBeNull()
    expect(r.yoy).toBeNull()
  })
})
