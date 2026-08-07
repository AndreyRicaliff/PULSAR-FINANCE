/**
 * @file O risco desta linha é MENTIR com cara de precisão: prometer cobertura sem saber o
 * saldo, esquecer conta vencida, ou tratar "saldo zero" como "saldo não informado". Cada
 * caso aqui é uma dessas mentiras, travada.
 */
import { describe, expect, it } from 'vitest'
import { calcularLinhaCaixa, somarDias } from './caixaCliente'
import type { Movimento } from './movimento'

const HOJE = '2026-08-07'

const base: Movimento = {
  idTitulo: '1',
  categoria: 'c',
  valorCentavos: 0,
  campoValor: 'x',
  data: '',
  dataEmissao: '',
  dataRegistro: '',
  dataPrevisao: '',
  dataVencimento: '',
  status: '',
  liquidado: 'N',
  documento: '',
  parcela: '',
  contraparte: '',
  contraparteCodigo: '',
  natureza: 'P',
  grupo: '',
  origem: 'COMP',
  tipoDocumento: '',
  operacao: '',
  contaCorrente: '',
  jurosCentavos: 0,
  multaCentavos: 0,
  descontoCentavos: 0,
  valorPagoCentavos: 0,
  valorAbertoCentavos: 0,
}

/** Título a pagar em aberto, vencendo em `venc` (dd/mm/aaaa). */
const aberto = (venc: string, valor: number, natureza: 'P' | 'R' = 'P'): Movimento => ({
  ...base,
  natureza,
  dataVencimento: venc,
  valorAbertoCentavos: valor,
})

/** Baixa (caixa realizado) no dia `pag`. */
const pago = (pag: string, valor: number, natureza: 'P' | 'R'): Movimento => ({
  ...base,
  natureza,
  liquidado: 'S',
  dataPagamento: pag,
  valorPagoCentavos: valor,
})

describe('somarDias', () => {
  it('soma atravessando o mês', () => expect(somarDias('2026-08-07', 30)).toBe('2026-09-06'))
  it('soma atravessando o ano', () => expect(somarDias('2026-12-15', 30)).toBe('2027-01-14'))
})

describe('sem saldo informado — diz o que sabe, sem inventar cobertura', () => {
  it('com contas: frase aponta o corte e explica por que não há cobertura', () => {
    const l = calcularLinhaCaixa([aberto('20/08/2026', 50_000)], null, HOJE)!
    expect(l.disponivelCentavos).toBeNull()
    expect(l.folgaCentavos).toBeNull()
    expect(l.tom).toBe('neutro')
    expect(l.frase).toMatch(/cobertura aparece quando o saldo/)
    expect(l.frase).not.toMatch(/cobre/i)
  })
  it('sem nada a dizer: some (null), em vez de ocupar a tela com vazio', () => {
    expect(calcularLinhaCaixa([], null, HOJE)).toBeNull()
  })
})

describe('saldo ZERO informado ≠ saldo não informado', () => {
  it('zero é um saldo real: gera cobertura (negativa)', () => {
    const l = calcularLinhaCaixa([aberto('20/08/2026', 50_000)], 0, HOJE)!
    expect(l.disponivelCentavos).toBe(0)
    expect(l.tom).toBe('negativo')
    expect(l.frase).toMatch(/não cobre a próxima conta/)
  })
})

describe('cobertura', () => {
  it('cobre tudo: positivo', () => {
    const l = calcularLinhaCaixa([aberto('20/08/2026', 30_000), aberto('01/09/2026', 40_000)], 100_000, HOJE)!
    expect(l.tom).toBe('positivo')
    expect(l.frase).toBe('O caixa de hoje cobre as contas dos próximos 30 dias.')
    expect(l.folgaCentavos).toBe(30_000)
  })

  it('cobre até uma data no meio: atenção, e a data é a da ÚLTIMA conta coberta', () => {
    const l = calcularLinhaCaixa(
      [aberto('15/08/2026', 40_000), aberto('28/08/2026', 40_000), aberto('02/09/2026', 40_000)],
      90_000,
      HOJE,
    )!
    expect(l.tom).toBe('atencao')
    expect(l.frase).toBe('O caixa de hoje cobre as contas até 28 de agosto.')
  })

  it('não cobre nem a primeira: negativo', () => {
    const l = calcularLinhaCaixa([aberto('15/08/2026', 200_000)], 10_000, HOJE)!
    expect(l.tom).toBe('negativo')
    expect(l.frase).toBe('O caixa de hoje não cobre a próxima conta (15 de agosto).')
  })

  it('conta VENCIDA continua devida: entra no corte como devida hoje', () => {
    // Vencida em julho, não paga. Sem ela o app diria "cobre tudo" — mentira.
    const l = calcularLinhaCaixa([aberto('10/07/2026', 80_000), aberto('20/08/2026', 30_000)], 90_000, HOJE)!
    expect(l.aPagarCentavos).toBe(110_000)
    expect(l.tom).toBe('atencao')
    // Cobre a vencida (rotulada como hoje) mas não a de 20/08.
    expect(l.frase).toBe('O caixa de hoje cobre as contas até 7 de agosto.')
  })

  it('título fora dos 30 dias não entra no corte', () => {
    const l = calcularLinhaCaixa([aberto('20/10/2026', 999_999), aberto('20/08/2026', 10_000)], 50_000, HOJE)!
    expect(l.aPagarCentavos).toBe(10_000)
    expect(l.tom).toBe('positivo')
  })
})

describe('disponível = saldo do mês + caixa do mês até hoje', () => {
  it('entradas somam, saídas subtraem, e baixa de OUTRO mês não entra (já está no saldo)', () => {
    const movs = [
      pago('05/08/2026', 20_000, 'R'), // entra
      pago('06/08/2026', 5_000, 'P'), // sai
      pago('10/07/2026', 999_999, 'R'), // mês passado — embutida no saldo inicial
      aberto('20/08/2026', 30_000),
    ]
    const l = calcularLinhaCaixa(movs, 50_000, HOJE)!
    expect(l.disponivelCentavos).toBe(50_000 + 20_000 - 5_000)
    expect(l.tom).toBe('positivo')
  })

  it('a receber é contexto: reportado, mas NUNCA entra na cobertura', () => {
    const l = calcularLinhaCaixa([aberto('20/08/2026', 50_000), aberto('18/08/2026', 500_000, 'R')], 10_000, HOJE)!
    expect(l.aReceberCentavos).toBe(500_000)
    expect(l.tom).toBe('negativo') // o recebível previsto não paga a conta de amanhã
  })
})

describe('linguagem de dono', () => {
  it('nenhuma frase vaza jargão de contador', () => {
    const casos = [
      calcularLinhaCaixa([aberto('20/08/2026', 50_000)], null, HOJE),
      calcularLinhaCaixa([aberto('20/08/2026', 50_000)], 100_000, HOJE),
      calcularLinhaCaixa([aberto('20/08/2026', 50_000)], 0, HOJE),
      calcularLinhaCaixa([], 10_000, HOJE),
    ]
    for (const l of casos) {
      expect(l).not.toBeNull()
      expect(l!.frase).not.toMatch(/compet[êe]ncia|regime|DFC|DRE|t[íi]tulo|liquidad/i)
    }
  })
})
