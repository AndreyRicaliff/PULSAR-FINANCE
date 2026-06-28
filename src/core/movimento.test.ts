import { describe, expect, it } from 'vitest'
import { aVencer, movimentosCaixa } from './movimento'
import type { Movimento } from './movimento'

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
