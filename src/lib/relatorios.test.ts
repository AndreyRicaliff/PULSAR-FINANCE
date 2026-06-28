import { describe, expect, it } from 'vitest'
import type { Movimento } from '@/core/movimento'
import type { GrupoEspelho } from './resultado'
import { aging, custosDetalhe, fontesReceita, prazosMedios, receitaPorCliente, totalAberto } from './relatorios'

function grupo(id: string, nome: string, total: number, neutra = false): GrupoEspelho {
  return { id, nome, totalCentavos: total, qtd: 1, meta: neutra ? { neutra: true } : undefined, subgrupos: [] }
}

const grupos: GrupoEspelho[] = [
  grupo('rec', 'Receita Bruta', 100_000),
  grupo('custo', 'Custos Variáveis', -40_000),
  grupo('desp', 'Despesas Adm', -10_000),
  grupo('neu', 'Neutros', 999_999, true),
]

describe('fontesReceita / custosDetalhe', () => {
  it('fontesReceita pega só entradas (>0) e exclui neutros, com % da receita líquida', () => {
    const r = fontesReceita(grupos, 100_000)
    expect(r.map((l) => l.label)).toEqual(['Receita Bruta'])
    expect(r[0]!.valorCentavos).toBe(100_000)
    expect(r[0]!.pctReceita).toBe('100,0%')
  })

  it('custosDetalhe pega só saídas (<0) em magnitude positiva, maior→menor', () => {
    const r = custosDetalhe(grupos, 100_000)
    expect(r.map((l) => l.label)).toEqual(['Custos Variáveis', 'Despesas Adm'])
    expect(r[0]!.valorCentavos).toBe(40_000)
    expect(r[0]!.pctReceita).toBe('40,0%')
  })

  it("pctReceita vira '—' quando a base é 0 (sem divisão por zero)", () => {
    expect(custosDetalhe(grupos, 0)[0]!.pctReceita).toBe('—')
  })
})

function mov(p: Partial<Movimento>): Movimento {
  return {
    idTitulo: '1', categoria: '1.01', valorCentavos: 0, campoValor: 'valor', data: '01/01/2026',
    dataEmissao: '', dataRegistro: '', dataPrevisao: '', dataVencimento: '01/01/2026', status: '',
    liquidado: '', documento: '', parcela: '', contraparte: '', contraparteCodigo: '', natureza: 'R',
    grupo: '', origem: '', tipoDocumento: '', operacao: '', contaCorrente: '', jurosCentavos: 0,
    multaCentavos: 0, descontoCentavos: 0, valorPagoCentavos: 0, valorAbertoCentavos: 0, ...p,
  }
}

describe('aging / totalAberto', () => {
  const hoje = new Date(2026, 5, 8) // 08/06/2026
  const movs: Movimento[] = [
    mov({ natureza: 'R', valorAbertoCentavos: 100, dataVencimento: '08/07/2026' }), // a vencer
    mov({ natureza: 'R', valorAbertoCentavos: 200, dataVencimento: '20/05/2026' }), // ~19d vencido
    mov({ natureza: 'R', valorAbertoCentavos: 300, dataVencimento: '01/01/2026' }), // >90 vencido
    mov({ natureza: 'R', valorAbertoCentavos: 0, dataVencimento: '01/01/2026' }), // liquidado: ignora
    mov({ natureza: 'P', valorAbertoCentavos: 500, dataVencimento: '01/01/2026' }), // outra natureza
  ]

  it('classifica recebíveis em aberto por faixa de vencimento', () => {
    const f = aging(movs, 'R', hoje)
    const v = (faixa: string) => f.find((x) => x.faixa === faixa)!.valorCentavos
    expect(v('A vencer')).toBe(100)
    expect(v('0–30 vencido')).toBe(200)
    expect(v('> 90 vencido')).toBe(300)
    expect(v('31–90 vencido')).toBe(0)
  })

  it('totalAberto soma só a natureza pedida e ignora liquidados', () => {
    expect(totalAberto(movs, 'R')).toBe(600)
    expect(totalAberto(movs, 'P')).toBe(500)
  })
})

describe('receitaPorCliente', () => {
  it('agrupa títulos R por contraparte, soma, ordena maior→menor e ignora P/sem contraparte', () => {
    const movs: Movimento[] = [
      mov({ natureza: 'R', contraparte: 'Cliente A', valorCentavos: 300 }),
      mov({ natureza: 'R', contraparte: 'Cliente B', valorCentavos: 500 }),
      mov({ natureza: 'R', contraparte: 'Cliente A', valorCentavos: 200 }),
      mov({ natureza: 'R', contraparte: '', valorCentavos: 999 }), // sem contraparte: fora
      mov({ natureza: 'P', contraparte: 'Fornecedor', valorCentavos: 999 }), // pagamento: fora
    ]
    const r = receitaPorCliente(movs)
    expect(r).toEqual([
      { label: 'Cliente A', valorCentavos: 500 },
      { label: 'Cliente B', valorCentavos: 500 },
    ])
  })

  it('respeita o teto max de clientes', () => {
    const movs: Movimento[] = ['A', 'B', 'C'].map((c, i) =>
      mov({ natureza: 'R', contraparte: c, valorCentavos: 100 + i }),
    )
    expect(receitaPorCliente(movs, 2)).toHaveLength(2)
  })
})

describe('prazosMedios', () => {
  it('PMR/PMP/ciclo pela fórmula da Espec §7', () => {
    const p = prazosMedios({ recebiveis: 50_00, pagaveis: 30_00, receita: 100_00, compras: 60_00, dias: 30 })
    expect(p.pmr).toBe(15) // (50/100)×30
    expect(p.pmp).toBe(15) // (30/60)×30
    expect(p.ciclo).toBe(0)
  })
  it('sem receita/compras → null (não divide por zero)', () => {
    const p = prazosMedios({ recebiveis: 10, pagaveis: 10, receita: 0, compras: 0, dias: 30 })
    expect(p.pmr).toBeNull()
    expect(p.pmp).toBeNull()
    expect(p.ciclo).toBeNull()
  })
})
