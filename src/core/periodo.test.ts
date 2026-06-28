import { describe, expect, it } from 'vitest'
import type { Movimento } from './movimento'
import { coberturaDatas, dataDoMovimento, diasDoPeriodo, filtrarPorPeriodo, intervaloAnterior, intervaloDoPreset, isoDeMov } from './periodo'

function mov(p: Partial<Movimento>): Movimento {
  return {
    idTitulo: '1', categoria: '1.01', valorCentavos: 100, campoValor: 'valor', data: '',
    dataEmissao: '', dataRegistro: '', dataPrevisao: '', dataVencimento: '', status: '',
    liquidado: '', documento: '', parcela: '', contraparte: '', contraparteCodigo: '', natureza: 'R',
    grupo: '', origem: '', tipoDocumento: '', operacao: '', contaCorrente: '', jurosCentavos: 0,
    multaCentavos: 0, descontoCentavos: 0, valorPagoCentavos: 0, valorAbertoCentavos: 0, ...p,
  }
}

describe('isoDeMov', () => {
  it('converte dd/mm/aaaa em ISO ordenável', () => {
    expect(isoDeMov('05/03/2026')).toBe('2026-03-05')
  })
  it('devolve null para data inválida', () => {
    expect(isoDeMov('')).toBeNull()
    expect(isoDeMov('2026-03-05')).toBeNull()
  })
})

describe('dataDoMovimento', () => {
  it('competência usa emissão', () => {
    expect(dataDoMovimento(mov({ dataEmissao: '10/02/2026' }), 'competencia')).toBe('2026-02-10')
  })
  it('caixa ancora na data de pagamento (real), ignorando emissão', () => {
    expect(dataDoMovimento(mov({ dataPagamento: '20/02/2026', dataEmissao: '01/01/2026' }), 'caixa')).toBe('2026-02-20')
  })
  it('caixa sem pagamento fica fora (nada moveu)', () => {
    expect(dataDoMovimento(mov({ dataVencimento: '20/02/2026' }), 'caixa')).toBeNull()
  })
  it('competência sem emissão cai na data canônica (evento de extrato)', () => {
    expect(dataDoMovimento(mov({ idTitulo: '0', data: '02/04/2026' }), 'competencia')).toBe('2026-04-02')
  })
  it('competência sem emissão nem data fica fora', () => {
    expect(dataDoMovimento(mov({}), 'competencia')).toBeNull()
  })
})

describe('filtrarPorPeriodo', () => {
  it('janela aberta em competência passa tudo, inclusive sem data', () => {
    const movs = [mov({ dataEmissao: '01/02/2026' }), mov({})]
    const r = filtrarPorPeriodo(movs, { inicio: null, fim: null }, 'competencia')
    expect(r.dentro).toHaveLength(2)
    expect(r.fora).toBe(0)
  })
  it('com janela, exclui fora do intervalo e sem data', () => {
    const movs = [
      mov({ dataEmissao: '15/02/2026' }), // dentro
      mov({ dataEmissao: '15/05/2026' }), // fora
      mov({}), // sem data
    ]
    const r = filtrarPorPeriodo(movs, { inicio: '2026-02-01', fim: '2026-02-28' }, 'competencia')
    expect(r.dentro).toHaveLength(1)
    expect(r.fora).toBe(2)
  })
})

describe('coberturaDatas', () => {
  it('conta quantos têm data no regime', () => {
    const movs = [mov({ dataEmissao: '01/01/2026' }), mov({})]
    expect(coberturaDatas(movs, 'competencia')).toEqual({ comData: 1, total: 2 })
  })
})

describe('intervaloDoPreset', () => {
  it('mês atual', () => {
    expect(intervaloDoPreset('mes-atual', '2026-06-09')).toEqual({ inicio: '2026-06-01', fim: '2026-06-30' })
  })
  it('mês anterior cruza ano', () => {
    expect(intervaloDoPreset('mes-anterior', '2026-01-09')).toEqual({ inicio: '2025-12-01', fim: '2025-12-31' })
  })
  it('3 meses inclui o mês corrente', () => {
    expect(intervaloDoPreset('3m', '2026-06-09')).toEqual({ inicio: '2026-04-01', fim: '2026-06-30' })
  })
  it('ano', () => {
    expect(intervaloDoPreset('ano', '2026-06-09')).toEqual({ inicio: '2026-01-01', fim: '2026-12-31' })
  })
  it('tudo é aberto', () => {
    expect(intervaloDoPreset('tudo', '2026-06-09')).toEqual({ inicio: null, fim: null })
  })
})

describe('diasDoPeriodo', () => {
  it('janela fechada: diferença inclusiva de dias', () => {
    expect(diasDoPeriodo([], { inicio: '2026-02-01', fim: '2026-02-28' }, 'competencia')).toBe(28)
  })
  it('janela aberta: amplitude real das datas dos movimentos', () => {
    const movs = [mov({ dataEmissao: '01/01/2026' }), mov({ dataEmissao: '31/01/2026' })]
    expect(diasDoPeriodo(movs, { inicio: null, fim: null }, 'competencia')).toBe(31)
  })
  it('sem data nenhuma → 0 (PMR/PMP viram —)', () => {
    expect(diasDoPeriodo([mov({})], { inicio: null, fim: null }, 'competencia')).toBe(0)
  })
})

describe('intervaloAnterior', () => {
  it('janela fechada → janela imediatamente anterior com a mesma duração', () => {
    expect(intervaloAnterior({ inicio: '2026-06-01', fim: '2026-06-30' })).toEqual({ inicio: '2026-05-02', fim: '2026-05-31' })
    expect(intervaloAnterior({ inicio: '2026-03-01', fim: '2026-03-01' })).toEqual({ inicio: '2026-02-28', fim: '2026-02-28' })
  })
  it('janela aberta não tem anterior (sem comparação inventada)', () => {
    expect(intervaloAnterior({ inicio: null, fim: null })).toBeNull()
    expect(intervaloAnterior({ inicio: '2026-01-01', fim: null })).toBeNull()
  })
})
