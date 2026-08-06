/**
 * @file Regressão do report 2026-08-06 ("apresentações em html em branco"): cada cenário aqui
 * foi REPRODUZIDO em produção antes de virar teste — cliente sem Matriz (REALIZE) e período
 * sem movimento (IMPERIAL PIZZAS com ago/26). O export não pode mais sair zerado em silêncio.
 */
import { describe, expect, it } from 'vitest'
import { diagnosticarApresentacao } from './diagnosticoApresentacao'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'

const mov = (categoria: string, data: string): Movimento =>
  ({ idTitulo: `t-${categoria}-${data}`, categoria, valorCentavos: 10_000, campoValor: 'x',
     data, dataEmissao: data, dataRegistro: data, dataPrevisao: data, dataVencimento: data,
     status: '', liquidado: 'S' }) as unknown as Movimento

const CONC: Conciliacao = { estrutura: [{ id: 'receita', nome: 'Receita', paiId: null }], mapa: { '1.01': 'receita' } } as unknown as Conciliacao
const VAZIA: Conciliacao = { estrutura: [], mapa: {} } as unknown as Conciliacao
const TUDO = { inicio: null, fim: null }

describe('diagnosticarApresentacao', () => {
  it('cliente sem movimento nenhum → manda sincronizar', () => {
    const d = diagnosticarApresentacao([], CONC, TUDO)
    expect(d.temDado).toBe(false)
    expect(d.causa).toBe('sem-movimento')
    expect(d.mensagem).toMatch(/sync/i)
  })

  // REALIZE em prod: 330 kB de movimentos, zero modelo-v4 → DRE e DFC saíam R$ 0,00.
  it('cliente sem Matriz conciliada → aponta a Matriz, não o período', () => {
    const d = diagnosticarApresentacao([mov('1.01', '2026-07-10')], VAZIA, TUDO)
    expect(d.causa).toBe('sem-conciliacao')
    expect(d.mensagem).toMatch(/Matriz/)
  })

  // IMPERIAL PIZZAS com período ago/26 (antes do sync do mês): R$ 2,4 mi viram R$ 0,00.
  it('período sem movimento → aponta o período', () => {
    const d = diagnosticarApresentacao(
      [mov('1.01', '2026-07-10')],
      CONC,
      { inicio: '2026-08-01', fim: '2026-08-31' },
    )
    expect(d.temDado).toBe(false)
    expect(d.causa).toBe('periodo-sem-movimento')
  })

  it('movimentos no período mas todos em categoria não conciliada', () => {
    const d = diagnosticarApresentacao([mov('9.99', '2026-07-10')], CONC, TUDO)
    expect(d.causa).toBe('nada-classificado')
    expect(d.mensagem).toContain('1 movimentos')
  })

  it('conciliação vazia vence período errado — o operador ouve o que ele resolve primeiro', () => {
    const d = diagnosticarApresentacao([mov('1.01', '2026-07-10')], VAZIA, { inicio: '2026-08-01', fim: '2026-08-31' })
    expect(d.causa).toBe('sem-conciliacao')
  })

  it('caminho feliz: há movimento classificado no período', () => {
    const d = diagnosticarApresentacao([mov('1.01', '2026-07-10'), mov('9.99', '2026-07-11')], CONC, TUDO)
    expect(d.temDado).toBe(true)
    expect(d.causa).toBeNull()
    expect(d.classificados).toBe(1)
    expect(d.movimentosNoPeriodo).toBe(2)
  })

  it('regime caixa: movimento sem data de pagamento fica fora da janela de caixa', () => {
    const d = diagnosticarApresentacao([mov('1.01', '2026-07-10')], CONC, { inicio: '2026-07-01', fim: '2026-07-31' }, 'caixa')
    expect(d.causa).toBe('periodo-sem-movimento')
  })
})
