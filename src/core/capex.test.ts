import { describe, expect, it } from 'vitest'
import { resumoCapex } from './capex'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'

const mov = (p: Partial<Movimento>): Movimento =>
  ({
    idTitulo: '1',
    categoria: '2.08.01',
    valorCentavos: 100_000,
    valorPagoCentavos: 100_000,
    dataPagamento: '15/03/2026',
    data: '01/03/2026',
    natureza: 'P',
    contraparte: '',
    contraparteCodigo: '',
    parcela: '',
    documento: '',
    contaCorrente: '',
    ...p,
  }) as Movimento

const conc: Conciliacao = {
  estrutura: [
    { id: 'g_inv', nome: 'Investimento', paiId: null, meta: { atividadeDFC: 'investimento' } },
    { id: 'inv_imob', nome: 'Aquisição de Imobilizado', paiId: 'g_inv', meta: { atividadeDFC: 'investimento', capex: 'investimento' } },
    { id: 'g_adm', nome: 'Administrativas', paiId: null, meta: { papelDRE: 'despesa_operacional' } },
    { id: 'adm_manut', nome: 'Manutenção', paiId: 'g_adm', meta: { papelDRE: 'despesa_operacional', capex: 'manutencao' } },
    { id: 'adm_soft', nome: 'Software', paiId: 'g_adm' },
  ],
  mapa: { '2.08.01': 'inv_imob', '2.05.06': 'adm_manut', '2.05.04': 'adm_soft' },
}

describe('resumoCapex (base caixa)', () => {
  it('soma só nós marcados, pelo valor PAGO, no mês do pagamento', () => {
    const r = resumoCapex(
      [
        mov({ categoria: '2.08.01', valorCentavos: 500_000, valorPagoCentavos: 300_000 }),
        mov({ categoria: '2.05.06', valorPagoCentavos: 50_000, dataPagamento: '02/04/2026' }),
        mov({ categoria: '2.05.04' }), // nó sem capex: fora
        mov({ categoria: '2.08.01', valorPagoCentavos: 0 }), // em aberto: fora (não é caixa)
      ],
      conc,
    )
    expect(r.investimentoCentavos).toBe(300_000)
    expect(r.manutencaoCentavos).toBe(50_000)
    expect(r.porMes).toEqual([
      { mes: '2026-03', investimentoCentavos: 300_000, manutencaoCentavos: 0 },
      { mes: '2026-04', investimentoCentavos: 0, manutencaoCentavos: 50_000 },
    ])
    expect(r.porNo.map((n) => n.nome)).toEqual(['Aquisição de Imobilizado', 'Manutenção'])
    expect(r.temNoMarcado).toBe(true)
  })

  it('natureza R (estorno/devolução) SUBTRAI do balde', () => {
    const r = resumoCapex(
      [mov({ categoria: '2.08.01', valorPagoCentavos: 100_000 }), mov({ categoria: '2.08.01', valorPagoCentavos: 30_000, natureza: 'R' })],
      conc,
    )
    expect(r.investimentoCentavos).toBe(70_000)
  })

  it('sub SEM meta herda o capex da raiz; sub COM meta própria sem capex NÃO herda', () => {
    const c: Conciliacao = {
      estrutura: [
        { id: 'g', nome: 'CAPEX', paiId: null, meta: { atividadeDFC: 'investimento', capex: 'investimento' } },
        { id: 's_herda', nome: 'Herda', paiId: 'g' },
        { id: 's_propria', nome: 'Meta própria', paiId: 'g', meta: { regime: 'dfc' } },
      ],
      mapa: { '2.01': 's_herda', '2.02': 's_propria' },
    }
    const r = resumoCapex([mov({ categoria: '2.01' }), mov({ categoria: '2.02' })], c)
    expect(r.investimentoCentavos).toBe(100_000) // só o que herda
    expect(r.temNoMarcado).toBe(true)
  })

  it('estrutura sem nó marcado reporta temNoMarcado=false', () => {
    const c: Conciliacao = { estrutura: [{ id: 'g', nome: 'G', paiId: null }], mapa: { '2.01': 'g' } }
    expect(resumoCapex([mov({ categoria: '2.01' })], c).temNoMarcado).toBe(false)
  })
})
