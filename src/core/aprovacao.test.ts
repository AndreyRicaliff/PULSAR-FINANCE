import { describe, expect, it } from 'vitest'
import {
  COR_STATUS,
  emAberto,
  podeIr,
  ROTULO_EVENTO,
  ROTULO_STATUS,
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
