import { describe, expect, it } from 'vitest'
import type { Movimento } from '@/core/movimento'
import { totaisDe } from './totais'

function mov(p: Partial<Movimento>): Movimento {
  return {
    idTitulo: '1', categoria: '1.01', valorCentavos: 0, campoValor: 'valor', data: '01/01/2026',
    dataEmissao: '', dataRegistro: '', dataPrevisao: '', dataVencimento: '01/01/2026', status: '',
    liquidado: '', documento: '', parcela: '', contraparte: '', contraparteCodigo: '', natureza: 'R',
    grupo: '', origem: '', tipoDocumento: '', operacao: '', contaCorrente: '', jurosCentavos: 0,
    multaCentavos: 0, descontoCentavos: 0, valorPagoCentavos: 0, valorAbertoCentavos: 0, ...p,
  }
}

describe('totaisDe', () => {
  it('separa entradas (R) de saídas (P) e calcula o saldo', () => {
    const t = totaisDe([
      mov({ natureza: 'R', valorCentavos: 1000 }),
      mov({ natureza: 'R', valorCentavos: 500 }),
      mov({ natureza: 'P', valorCentavos: 400 }),
    ])
    expect(t).toEqual({ entrada: 1500, saida: 400, saldo: 1100, qtd: 3 })
  })

  it('lista vazia → tudo zero (sem divisão ou NaN)', () => {
    expect(totaisDe([])).toEqual({ entrada: 0, saida: 0, saldo: 0, qtd: 0 })
  })
})
