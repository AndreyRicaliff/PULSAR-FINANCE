import { describe, expect, it } from 'vitest'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import { separarNeutros } from './neutros'

function mov(categoria: string): Movimento {
  return {
    idTitulo: '1', categoria, valorCentavos: 100, campoValor: 'valor', data: '01/01/2026',
    dataEmissao: '', dataRegistro: '', dataPrevisao: '', dataVencimento: '', status: '',
    liquidado: '', documento: '', parcela: '', contraparte: '', contraparteCodigo: '', natureza: 'R',
    grupo: '', origem: '', tipoDocumento: '', operacao: '', contaCorrente: '', jurosCentavos: 0,
    multaCentavos: 0, descontoCentavos: 0, valorPagoCentavos: 0, valorAbertoCentavos: 0,
  }
}

const conc: Conciliacao = {
  estrutura: [
    { id: 'g_receita', nome: 'Receitas', paiId: null },
    { id: 'g_transf', nome: 'Transferências', paiId: null, meta: { neutra: true } },
  ],
  mapa: { '1.01': 'g_receita', '9.99': 'g_transf' },
}

describe('separarNeutros', () => {
  it('separa pelo meta.neutra do nó conciliado', () => {
    const { operacionais, neutros } = separarNeutros([mov('1.01'), mov('9.99')], conc)
    expect(operacionais.map((m) => m.categoria)).toEqual(['1.01'])
    expect(neutros.map((m) => m.categoria)).toEqual(['9.99'])
  })
  it('não conciliado é operacional (cai em "a conciliar", não some)', () => {
    const { operacionais, neutros } = separarNeutros([mov('X')], conc)
    expect(operacionais).toHaveLength(1)
    expect(neutros).toHaveLength(0)
  })
})
