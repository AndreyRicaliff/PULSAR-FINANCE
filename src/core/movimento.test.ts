import { describe, expect, it } from 'vitest'
import { aVencer, chaveContraparte, movimentosCaixa } from './movimento'
import type { Movimento } from './movimento'

const GUID_NULO = '00000000-0000-0000-0000-000000000000'

const mov = (liquidado: string, valor: number, pago: number): Movimento =>
  ({ liquidado, valorCentavos: valor, valorPagoCentavos: pago } as Movimento)

describe('movimentosCaixa (DFC = caixa pago)', () => {
  it('aVencer é só o em aberto (liquidado N)', () => {
    expect(aVencer(mov('N', 100, 0))).toBe(true)
    expect(aVencer(mov('S', 100, 100))).toBe(false)
  })

  it('exclui a vencer (pago 0) e usa o valor PAGO (parcial conta só a parte paga)', () => {
    const r = movimentosCaixa([
      mov('N', 1000, 0), // a vencer → fora
      mov('S', 1000, 400), // pago parcial → conta 400
      mov('', 800, 800), // extrato → conta 800
    ])
    expect(r.map((m) => m.valorCentavos)).toEqual([400, 800])
  })
})

describe('chaveContraparte', () => {
  it('código do cadastro vence o nome cru', () => {
    expect(chaveContraparte({ contraparteCodigo: '4570157862', contraparte: 'ACME' })).toBe('4570157862')
  })

  it('GUID nulo Nibo cai no nome cru do lançamento', () => {
    expect(chaveContraparte({ contraparteCodigo: GUID_NULO, contraparte: 'MARIA SILVA' })).toBe('MARIA SILVA')
  })

  it('nome cru é normalizado com trim (whitespace do ERP não fragmenta o bucket)', () => {
    expect(chaveContraparte({ contraparteCodigo: '', contraparte: ' ACME ' })).toBe('ACME')
  })

  it('sem código e sem nome (ou nome só de espaços) → SEM', () => {
    expect(chaveContraparte({ contraparteCodigo: '', contraparte: '' })).toBe('SEM')
    expect(chaveContraparte({ contraparteCodigo: GUID_NULO, contraparte: '   ' })).toBe('SEM')
  })
})
