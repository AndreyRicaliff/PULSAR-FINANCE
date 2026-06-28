import { describe, expect, it } from 'vitest'
import { fluxoDiario, fluxoNoPeriodo, montarSemanas } from './projecao-semanal'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import type { Titulo } from './titulo'

describe('montarSemanas', () => {
  it('cobre o mês inteiro e fecha as semanas no domingo', () => {
    const s = montarSemanas('2026-05')
    expect(s.flatMap((w) => w.dias)).toHaveLength(31)
    expect(s[0]!.dias[0]).toEqual({ iso: '2026-05-01', rotulo: 'Sex 01' })
    expect(s[0]!.dias.at(-1)!.rotulo).toBe('Dom 03') // 01 sex, 02 sáb, 03 dom → fecha
  })
})

const conc: Conciliacao = { estrutura: [], mapa: { '1.01': 'g_rec', '2.01': 'g_desp' } }
const tit = (categoria: string, natureza: 'R' | 'P', venc: string, valor: number): Titulo =>
  ({ categoria, natureza, dataVencimento: venc, dataPrevisao: '', valorCentavos: valor, status: 'A VENCER' } as Titulo)
const mov = (categoria: string, natureza: string, pag: string, pago: number): Movimento =>
  ({ categoria, natureza, dataPagamento: pag, valorPagoCentavos: pago } as Movimento)

describe('fluxoDiario', () => {
  it('previsto pelo vencimento, realizado pelo pagamento, por nó', () => {
    // datas no formato Omie (dd/mm/aaaa), como vêm dos títulos/movimentos.
    const f = fluxoDiario([tit('1.01', 'R', '05/05/2026', 1000)], [mov('1.01', 'R', '06/05/2026', 800)], conc)
    expect(f.get('g_rec')!.get('2026-05-05')!.prevEntrada).toBe(1000)
    expect(f.get('g_rec')!.get('2026-05-06')!.realEntrada).toBe(800)
  })

  it('fluxoNoPeriodo soma os dias do intervalo', () => {
    const f = fluxoDiario([tit('2.01', 'P', '05/05/2026', 300), tit('2.01', 'P', '07/05/2026', 200)], [], conc)
    const semana = fluxoNoPeriodo(f.get('g_desp'), ['2026-05-05', '2026-05-06', '2026-05-07'])
    expect(semana.prevSaida).toBe(500)
  })
})
