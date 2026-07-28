import { describe, expect, it } from 'vitest'
import {
  COR_STATUS,
  emAberto,
  podeIr,
  ROTULO_EVENTO,
  ROTULO_STATUS,
  somarMeses,
  type StatusAprovacao,
} from './aprovacao'

const TODOS: readonly StatusAprovacao[] = ['pendente', 'aprovada', 'reprovada', 'agendada', 'paga', 'cancelada']

describe('máquina de estados (espelho do trigger)', () => {
  it('caminho feliz: pendente → aprovada → agendada → paga', () => {
    expect(podeIr('pendente', 'aprovada')).toBe(true)
    expect(podeIr('aprovada', 'agendada')).toBe(true)
    expect(podeIr('agendada', 'paga')).toBe(true)
  })

  it('reprovada só volta reabrindo — nunca vira aprovada direto', () => {
    expect(podeIr('reprovada', 'pendente')).toBe(true)
    expect(podeIr('reprovada', 'aprovada')).toBe(false)
  })

  it('decisão não se desfaz: aprovada nunca volta a pendente nem vira reprovada', () => {
    expect(podeIr('aprovada', 'pendente')).toBe(false)
    expect(podeIr('aprovada', 'reprovada')).toBe(false)
  })

  it('paga e cancelada são terminais', () => {
    for (const para of TODOS) {
      expect(podeIr('paga', para)).toBe(false)
      expect(podeIr('cancelada', para)).toBe(false)
    }
  })

  it('não se pula a decisão do cliente: pendente nunca vai direto a agendada/paga', () => {
    expect(podeIr('pendente', 'agendada')).toBe(false)
    expect(podeIr('pendente', 'paga')).toBe(false)
  })
})

describe('somarMeses (recorrência)', () => {
  it('anda mês a mês preservando o dia', () => {
    expect(somarMeses('2026-08-01', 1)).toBe('2026-09-01')
    expect(somarMeses('2026-08-15', 4)).toBe('2026-12-15')
  })

  it('vira o ano', () => {
    expect(somarMeses('2026-11-10', 3)).toBe('2027-02-10')
  })

  it('dia 31 num mês curto colapsa pro último dia — não pula pro mês seguinte', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2026-08-31', 1)).toBe('2026-09-30')
    expect(somarMeses('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('sequência de 12 meses a partir de 31/01 nunca escorrega de mês', () => {
    for (let i = 0; i < 12; i++) {
      const mesEsperado = ((0 + i) % 12) + 1
      expect(Number(somarMeses('2026-01-31', i).split('-')[1])).toBe(mesEsperado)
    }
  })
})

describe('rotulagem completa', () => {
  it('todo status tem rótulo e cor; em aberto = pede ação', () => {
    for (const s of TODOS) {
      expect(ROTULO_STATUS[s]).toBeTruthy()
      expect(COR_STATUS[s]).toBeTruthy()
    }
    expect(TODOS.filter((s) => emAberto({ status: s }))).toEqual(['pendente', 'aprovada', 'agendada'])
    expect(ROTULO_EVENTO.reabertura).toContain('nova rodada')
  })
})
