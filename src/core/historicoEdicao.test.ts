import { describe, expect, it } from 'vitest'
import { edicoesDe, HISTORICO_VAZIO, normalizarHistorico, registrarEdicao, type EdicaoNome } from './historicoEdicao'

const ev = (t: string, codigo: string, de: string | null, para: string | null): EdicaoNome => ({
  t,
  entidade: 'contraparte',
  codigo,
  de,
  para,
})

describe('registrarEdicao', () => {
  it('acumula eventos e no-op não entra (de == para)', () => {
    const h1 = registrarEdicao(HISTORICO_VAZIO, ev('2026-08-03T10:00', 'c1', null, 'Embalagens'))
    expect(h1.eventos).toHaveLength(1)
    expect(registrarEdicao(h1, ev('2026-08-03T10:01', 'c1', 'Embalagens', 'Embalagens'))).toBe(h1)
    expect(registrarEdicao(h1, ev('2026-08-03T10:02', 'c1', null, null))).toBe(h1)
  })
  it('teto descarta os mais antigos', () => {
    let h = HISTORICO_VAZIO
    for (let i = 0; i < 5; i++) h = registrarEdicao(h, ev(`t${i}`, 'c1', `v${i - 1}`, `v${i}`), 3)
    expect(h.eventos.map((e) => e.t)).toEqual(['t2', 't3', 't4'])
  })
})

describe('edicoesDe', () => {
  it('filtra por entidade+código e devolve mais recente primeiro', () => {
    let h = registrarEdicao(HISTORICO_VAZIO, ev('t1', 'c1', null, 'A'))
    h = registrarEdicao(h, ev('t2', 'c2', null, 'X'))
    h = registrarEdicao(h, ev('t3', 'c1', 'A', 'B'))
    expect(edicoesDe(h, 'contraparte', 'c1').map((e) => e.t)).toEqual(['t3', 't1'])
    expect(edicoesDe(h, 'categoria', 'c1')).toEqual([])
  })
})

describe('normalizarHistorico', () => {
  it('null e lixo viram histórico vazio', () => {
    expect(normalizarHistorico(null)).toEqual(HISTORICO_VAZIO)
    expect(normalizarHistorico({ eventos: 'lixo' })).toEqual(HISTORICO_VAZIO)
  })
})
