import { describe, expect, it } from 'vitest'
import type { Movimento } from './movimento'
import { mesclarMovimentos } from './sincronizacao'

function mov(p: Partial<Movimento>): Movimento {
  return {
    idTitulo: '1', categoria: '1.01', valorCentavos: 100, campoValor: 'valor', data: '01/01/2026',
    dataEmissao: '', dataRegistro: '', dataPrevisao: '', dataVencimento: '01/01/2026', status: 'aberto',
    liquidado: 'nao', documento: '', parcela: '', contraparte: 'ACME', contraparteCodigo: '', natureza: 'R',
    grupo: '', origem: '', tipoDocumento: '', operacao: '', contaCorrente: '', jurosCentavos: 0,
    multaCentavos: 0, descontoCentavos: 0, valorPagoCentavos: 0, valorAbertoCentavos: 100, ...p,
  }
}

describe('mesclarMovimentos', () => {
  it('atualiza só valor de título existente, preservando categoria/contraparte', () => {
    const atuais = [mov({ idTitulo: 'A', categoria: '1.01', contraparte: 'ACME', valorCentavos: 100, valorAbertoCentavos: 100 })]
    const recebidos = [mov({ idTitulo: 'A', categoria: '9.99', contraparte: 'OUTRO', valorCentavos: 250, valorAbertoCentavos: 0, liquidado: 'sim', status: 'pago' })]
    const r = mesclarMovimentos(atuais, recebidos)
    expect(r.atualizados).toBe(1)
    expect(r.novos).toBe(0)
    const m = r.movimentos[0]!
    expect(m.valorCentavos).toBe(250) // valor atualizado
    expect(m.liquidado).toBe('sim')
    expect(m.categoria).toBe('1.01') // classificação preservada
    expect(m.contraparte).toBe('ACME')
  })

  it('título novo entra inteiro (e fica "a conciliar" por não estar mapeado)', () => {
    const atuais = [mov({ idTitulo: 'A' })]
    const recebidos = [mov({ idTitulo: 'B', categoria: '2.50' })]
    const r = mesclarMovimentos(atuais, recebidos)
    expect(r.novos).toBe(1)
    expect(r.movimentos.map((m) => m.idTitulo).sort()).toEqual(['A', 'B'])
  })

  it('título sem mudança de valor não conta como atualizado', () => {
    const atuais = [mov({ idTitulo: 'A', valorCentavos: 100 })]
    const r = mesclarMovimentos(atuais, [mov({ idTitulo: 'A', valorCentavos: 100 })])
    expect(r.atualizados).toBe(0)
    expect(r.inalterados).toBe(1)
  })
})
