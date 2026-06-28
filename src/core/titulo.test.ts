import { describe, expect, it } from 'vitest'
import { agendaVencimentos, estaAberto, type Titulo } from './titulo'

const tit = (p: Partial<Titulo>): Titulo => ({
  id: '1', natureza: 'P', status: 'A VENCER', dataEmissao: '', dataVencimento: '',
  dataPrevisao: '', valorCentavos: 100, documento: '', categoria: '', fornecedorCodigo: '',
  parcela: '', contaCorrente: '', ...p,
})

describe('estaAberto', () => {
  it('só ATRASADO e A VENCER contam como abertos', () => {
    expect(estaAberto(tit({ status: 'ATRASADO' }))).toBe(true)
    expect(estaAberto(tit({ status: 'A VENCER' }))).toBe(true)
    expect(estaAberto(tit({ status: 'PAGO' }))).toBe(false)
    expect(estaAberto(tit({ status: 'CANCELADO' }))).toBe(false)
  })
})

describe('agendaVencimentos', () => {
  const HOJE = '2026-06-10'

  it('classifica por faixa de vencimento e exclui pagos/cancelados dos totais', () => {
    const a = agendaVencimentos(
      [
        tit({ id: 'v', status: 'ATRASADO', dataVencimento: '20/02/2026', valorCentavos: 500 }),
        tit({ id: 'h', dataVencimento: '10/06/2026', valorCentavos: 100 }),
        tit({ id: 's', dataVencimento: '15/06/2026', valorCentavos: 200 }),
        tit({ id: 'm', dataVencimento: '30/06/2026', valorCentavos: 300 }),
        tit({ id: 'f', dataVencimento: '20/12/2026', valorCentavos: 400 }),
        tit({ id: 'x', status: 'CANCELADO', dataVencimento: '15/06/2026', valorCentavos: 9999 }),
      ],
      HOJE,
    )
    expect(a.faixas.get('vencidos')?.map((t) => t.id)).toEqual(['v'])
    expect(a.faixas.get('hoje')?.map((t) => t.id)).toEqual(['h'])
    expect(a.faixas.get('ate7')?.map((t) => t.id)).toEqual(['s'])
    expect(a.faixas.get('ate30')?.map((t) => t.id)).toEqual(['m'])
    expect(a.faixas.get('depois')?.map((t) => t.id)).toEqual(['f'])
    expect(a.totalAbertoCentavos).toBe(1500)
    expect(a.qtdAbertos).toBe(5)
  })

  it('ordena por vencimento dentro da faixa', () => {
    const a = agendaVencimentos(
      [
        tit({ id: 'b', status: 'ATRASADO', dataVencimento: '05/03/2026' }),
        tit({ id: 'a', status: 'ATRASADO', dataVencimento: '01/02/2026' }),
      ],
      HOJE,
    )
    expect(a.faixas.get('vencidos')?.map((t) => t.id)).toEqual(['a', 'b'])
  })
})
