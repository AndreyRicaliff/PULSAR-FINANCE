import { describe, expect, it } from 'vitest'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import { A_CONCILIAR, abertoPorGrupo, grupoDoTitulo, projecaoMensal } from './projecao'
import type { Titulo } from './titulo'

function titulo(p: Partial<Titulo>): Titulo {
  return {
    id: '1', natureza: 'P', status: 'A VENCER', dataEmissao: '', dataVencimento: '10/07/2026',
    dataPrevisao: '', valorCentavos: 1000, documento: '', categoria: '2.01.01',
    fornecedorCodigo: '', parcela: '', contaCorrente: '', ...p,
  }
}
function mov(p: Partial<Movimento>): Movimento {
  return {
    idTitulo: '1', categoria: '2.01.01', valorCentavos: 1000, campoValor: '', data: '',
    dataEmissao: '', dataRegistro: '', dataPrevisao: '', dataVencimento: '', dataPagamento: '',
    dataConciliacao: '', status: '', liquidado: '', documento: '', parcela: '', contraparte: '',
    contraparteCodigo: '', natureza: 'P', grupo: '', origem: '', tipoDocumento: '', operacao: '',
    contaCorrente: '', departamento: '', idMovCC: '', jurosCentavos: 0, multaCentavos: 0,
    descontoCentavos: 0, valorPagoCentavos: 0, valorAbertoCentavos: 0, ...p,
  } as Movimento
}
const conc: Conciliacao = {
  estrutura: [{ id: 'g_desp', nome: 'Despesas', paiId: null }],
  mapa: { '2.01.01': 'g_desp' },
}

describe('projecaoMensal', () => {
  it('previsto = abertos por vencimento; realizado = pagamentos por mês', () => {
    const serie = projecaoMensal(
      [titulo({ valorCentavos: 500 }), titulo({ natureza: 'R', dataVencimento: '05/07/2026', valorCentavos: 800 })],
      [mov({ valorPagoCentavos: 300, dataPagamento: '01/06/2026' })],
    )
    expect(serie.map((s) => s.mes)).toEqual(['2026-06', '2026-07'])
    expect(serie[1]).toMatchObject({ previsto: { entrada: 800, saida: 500 } })
    expect(serie[0]).toMatchObject({ realizado: { entrada: 0, saida: 300 } })
  })
  it('título pago não entra no previsto', () => {
    const serie = projecaoMensal([titulo({ status: 'PAGO' })], [])
    expect(serie).toHaveLength(0)
  })
})

describe('abertoPorGrupo', () => {
  it('classifica pelo mapa e expõe o bucket a conciliar', () => {
    const grupos = abertoPorGrupo(
      [titulo({}), titulo({ categoria: 'X.99', valorCentavos: 700 })],
      conc,
    )
    expect(grupos.find((g) => g.grupoId === 'g_desp')?.saida).toBe(1000)
    expect(grupos.find((g) => g.grupoId === A_CONCILIAR)?.saida).toBe(700)
  })
})

describe('grupoDoTitulo', () => {
  it('null quando a categoria não está na matriz', () => {
    expect(grupoDoTitulo(titulo({ categoria: 'Z' }), conc)).toBeNull()
    expect(grupoDoTitulo(titulo({}), conc)).toBe('g_desp')
  })
})
