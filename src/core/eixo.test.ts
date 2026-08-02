import { describe, expect, it } from 'vitest'
import { brlCompacto, passoBonito, ticksDoEixo } from './eixo'

describe('brlCompacto', () => {
  it('abrevia milhar e milhão preservando o sinal', () => {
    expect(brlCompacto(25_333)).toBe('R$ 25k')
    expect(brlCompacto(-1_352_250)).toBe('-R$ 1,4M')
    expect(brlCompacto(-820)).toBe('-R$ 820')
    expect(brlCompacto(0)).toBe('R$ 0')
  })
})

describe('passoBonito', () => {
  it('devolve sempre 1, 2 ou 5 vezes potência de 10', () => {
    for (const span of [37, 418, 1_733, 25_000, 1_852_500, 9_999_999]) {
      const p = passoBonito(span)
      const mantissa = p / 10 ** Math.floor(Math.log10(p))
      expect([1, 2, 5]).toContain(Math.round(mantissa))
    }
  })

  it('span inválido não quebra o eixo', () => {
    expect(passoBonito(0)).toBe(1)
    expect(passoBonito(Number.NaN)).toBe(1)
  })
})

describe('ticksDoEixo', () => {
  it('cobre a faixa inteira e inclui o zero quando a série cruza o sinal', () => {
    const t = ticksDoEixo(-1_852_500, 1_796_780)
    expect(t[0]).toBeLessThanOrEqual(-1_500_000)
    expect(t.at(-1)).toBeGreaterThanOrEqual(1_500_000)
    expect(t).toContain(0)
  })

  it('série só negativa não inventa tick positivo', () => {
    const t = ticksDoEixo(-61_926, 0)
    expect(t.every((v) => v <= 0)).toBe(true)
    expect(t.length).toBeGreaterThanOrEqual(2)
  })

  it('nunca produz -0 (acúmulo de ponto flutuante vira "-R$ 0" na tela)', () => {
    for (const [min, max] of [
      [-100, 300],
      [-2_500, 7_500],
      [-1_352.25, 4_000],
    ] as const) {
      for (const t of ticksDoEixo(min, max)) expect(Object.is(t, -0)).toBe(false)
    }
  })

  it('faixa degenerada devolve uma marca só, sem laço infinito', () => {
    expect(ticksDoEixo(5, 5)).toEqual([5])
  })
})
