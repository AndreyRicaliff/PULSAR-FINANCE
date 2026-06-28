/**
 * @file Títulos de contas a pagar/receber (endpoints dedicados da Omie, não o mf).
 * Diferencial: status do ciclo de vida pronto (ATRASADO/A VENCER/PAGO/CANCELADO),
 * previsão de pagamento e parcela. Agenda de vencimentos derivada aqui (núcleo puro).
 */
import { isoDeMov } from './periodo'

export type NaturezaTitulo = 'P' | 'R'

export interface Titulo {
  readonly id: string
  readonly natureza: NaturezaTitulo
  /** status_titulo da Omie: ATRASADO | A VENCER | PAGO | CANCELADO (cru, sem reinterpretar). */
  readonly status: string
  readonly dataEmissao: string
  readonly dataVencimento: string
  readonly dataPrevisao: string
  readonly valorCentavos: number
  readonly documento: string
  readonly categoria: string
  readonly fornecedorCodigo: string
  readonly parcela: string
  readonly contaCorrente: string
}

export interface TitulosSeed {
  readonly geradoEm: string
  readonly titulos: readonly Titulo[]
}

const ABERTOS = new Set(['ATRASADO', 'A VENCER'])

export const estaAberto = (t: Titulo): boolean => ABERTOS.has(t.status.toUpperCase())

export type FaixaVencimento = 'vencidos' | 'hoje' | 'ate7' | 'ate30' | 'depois'

export const ROTULO_FAIXA: Readonly<Record<FaixaVencimento, string>> = {
  vencidos: 'Vencidos',
  hoje: 'Vencem hoje',
  ate7: 'Próximos 7 dias',
  ate30: 'Próximos 30 dias',
  depois: 'Mais adiante',
}

export interface Agenda {
  readonly faixas: ReadonlyMap<FaixaVencimento, readonly Titulo[]>
  readonly totalAbertoCentavos: number
  readonly qtdAbertos: number
}

function faixaDe(vencIso: string, hojeIso: string): FaixaVencimento {
  if (vencIso < hojeIso) return 'vencidos'
  if (vencIso === hojeIso) return 'hoje'
  if (vencIso <= somarDias(hojeIso, 7)) return 'ate7'
  if (vencIso <= somarDias(hojeIso, 30)) return 'ate30'
  return 'depois'
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Agenda dos títulos EM ABERTO por faixa de vencimento, ordenada por vencimento. */
export function agendaVencimentos(titulos: readonly Titulo[], hojeIso: string): Agenda {
  const faixas = new Map<FaixaVencimento, Titulo[]>(
    (Object.keys(ROTULO_FAIXA) as FaixaVencimento[]).map((f) => [f, []]),
  )
  let total = 0
  let qtd = 0
  for (const t of ordenarPorVencimento(titulos.filter(estaAberto))) {
    const venc = isoDeMov(t.dataVencimento)
    if (!venc) continue
    faixas.get(faixaDe(venc, hojeIso))?.push(t)
    total += t.valorCentavos
    qtd += 1
  }
  return { faixas, totalAbertoCentavos: total, qtdAbertos: qtd }
}

function ordenarPorVencimento(ts: readonly Titulo[]): Titulo[] {
  return [...ts].sort((a, b) => (isoDeMov(a.dataVencimento) ?? '').localeCompare(isoDeMov(b.dataVencimento) ?? ''))
}

export const somaCentavos = (ts: readonly Titulo[]): number => ts.reduce((s, t) => s + t.valorCentavos, 0)
