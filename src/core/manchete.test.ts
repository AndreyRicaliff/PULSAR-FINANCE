/**
 * @file A manchete é a PRIMEIRA coisa que o cliente lê — errar aqui é errar em voz alta.
 * O risco central não é cálculo, é honestidade: anunciar mês incompleto como se fosse
 * fechado, ou inventar percentual sobre base zero.
 */
import { describe, expect, it } from 'vitest'
import { calcularManchete, mesPorExtenso, ultimoMesFechado, type MesResumo } from './manchete'

const mes = (m: string, saldo: number, projetado = false): MesResumo => ({
  mes: m,
  rotulo: m.slice(5) + '/' + m.slice(2, 4),
  entrada: saldo > 0 ? saldo * 2 : 1000,
  saida: saldo > 0 ? saldo : 1000 + Math.abs(saldo),
  saldo,
  projetado,
})

describe('ultimoMesFechado', () => {
  it('ignora o mês CORRENTE — está incompleto por definição', () => {
    const s = [mes('2026-05', 100), mes('2026-06', 200), mes('2026-07', 10)]
    expect(ultimoMesFechado(s, '2026-07')?.mes).toBe('2026-06')
  })

  it('ignora meses projetados', () => {
    const s = [mes('2026-05', 100), mes('2026-06', 200, true)]
    expect(ultimoMesFechado(s, '2026-08')?.mes).toBe('2026-05')
  })

  it('série só com o mês corrente não tem mês fechado', () => {
    expect(ultimoMesFechado([mes('2026-07', 50)], '2026-07')).toBeNull()
  })
})

describe('calcularManchete', () => {
  it('sem mês fechado devolve null — a UI mostra outra coisa, não uma frase falsa', () => {
    expect(calcularManchete([mes('2026-07', 10)], '2026-07')).toBeNull()
  })

  it('mês positivo: fala em sobrar e compara com o anterior', () => {
    const m = calcularManchete([mes('2026-05', 100_000), mes('2026-06', 150_000)], '2026-07')
    expect(m?.tom).toBe('positivo')
    expect(m?.frase).toBe('Em junho de 2026, sobrou 50% a mais que em maio.')
  })

  it('mês negativo: fala em faltar, sem eufemismo', () => {
    const m = calcularManchete([mes('2026-05', 100_000), mes('2026-06', -20_000)], '2026-07')
    expect(m?.tom).toBe('negativo')
    expect(m?.frase).toContain('faltou')
  })

  it('base zero NÃO vira percentual — diz o que houve', () => {
    const m = calcularManchete([mes('2026-05', 0), mes('2026-06', 90_000)], '2026-07')
    expect(m?.variacao).toBeNull()
    expect(m?.frase).not.toContain('%')
  })

  it('primeiro mês da série não inventa comparação', () => {
    const m = calcularManchete([mes('2026-06', 90_000)], '2026-07')
    expect(m?.variacao).toBeNull()
    expect(m?.frase).toBe('Em junho de 2026, sobrou dinheiro no caixa da operação.')
  })

  it('variação desprezível vira "praticamente o mesmo", não 0%', () => {
    const m = calcularManchete([mes('2026-05', 100_000), mes('2026-06', 100_100)], '2026-07')
    expect(m?.frase).toContain('praticamente o mesmo')
  })

  it('empate exato é dito como equilíbrio', () => {
    const m = calcularManchete([mes('2026-05', 100_000), mes('2026-06', 0)], '2026-07')
    expect(m?.tom).toBe('neutro')
    expect(m?.frase).toContain('se equilibraram')
  })

  it('a frase NUNCA usa jargão de contador', () => {
    const m = calcularManchete([mes('2026-05', 100_000), mes('2026-06', 150_000)], '2026-07')
    expect(m?.frase).not.toMatch(/compet[êe]ncia|regime|DRE|DFC|conciliad/i)
  })

  it('queda de positivo para negativo mede sobre o módulo da base', () => {
    const m = calcularManchete([mes('2026-05', 100_000), mes('2026-06', -50_000)], '2026-07')
    expect(m?.variacao?.frac).toBeCloseTo(-1.5)
    expect(m?.frase).toContain('150% a menos')
  })
})

describe('mesPorExtenso', () => {
  it('traduz para leitura humana', () => {
    expect(mesPorExtenso('2026-03')).toBe('março de 2026')
  })
  it('valor fora do formato volta intacto em vez de virar undefined', () => {
    expect(mesPorExtenso('xx')).toBe('xx')
  })
})
