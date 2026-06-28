/**
 * @file Periodização e filtragem de movimentos. Núcleo puro (sem React).
 * Cada regime seleciona uma classe de evento e a data que a ancora:
 *  - competência: títulos pela data de emissão (regime da DRE);
 *  - caixa: eventos de extrato/baixa pela data de pagamento (dDtPagamento) — dinheiro que moveu.
 * Datas dos movimentos vêm em dd/mm/aaaa; usamos ISO 'aaaa-mm-dd' (ordenável) internamente.
 */
import type { Movimento } from './movimento'

export type Regime = 'competencia' | 'caixa'
export type Preset = 'tudo' | 'mes-atual' | 'mes-anterior' | '3m' | '6m' | '12m' | 'ano' | 'custom'

export interface Intervalo {
  readonly inicio: string | null // ISO 'aaaa-mm-dd' ou null = aberto
  readonly fim: string | null
}

export const INTERVALO_TUDO: Intervalo = { inicio: null, fim: null }

/** dd/mm/aaaa → 'aaaa-mm-dd' ordenável; null se não parseável. */
export function isoDeMov(data: string): string | null {
  const p = data.split('/')
  if (p.length !== 3) return null
  const [d, m, a] = p
  if (!d || !m || !a) return null
  return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** Data ISO que ancora o movimento no regime escolhido (null = fora do critério). */
export function dataDoMovimento(m: Movimento, regime: Regime): string | null {
  if (regime === 'caixa') return isoDeMov(m.dataPagamento || m.dataConciliacao || '')
  // Título tem emissão; evento de extrato (idTitulo=0) não — cai em `data`, a data canônica
  // que o sync resolve (emissão > venc > registro > pagamento). Sem isso o evento entra no
  // total do período mas em NENHUM mês — série mensal zerada com headline correto.
  return isoDeMov(m.dataEmissao || m.data)
}

export interface FiltroResultado {
  readonly dentro: readonly Movimento[]
  readonly fora: number
  readonly total: number
}

function aberto(i: Intervalo): boolean {
  return !i.inicio && !i.fim
}

/** Filtra por janela + regime. Janela aberta em competência = passa tudo (preserva o app fora do módulo). */
export function filtrarPorPeriodo(
  movs: readonly Movimento[],
  intervalo: Intervalo,
  regime: Regime,
): FiltroResultado {
  if (aberto(intervalo) && regime === 'competencia') {
    return { dentro: movs, fora: 0, total: movs.length }
  }
  const dentro = movs.filter((m) => {
    const iso = dataDoMovimento(m, regime)
    if (!iso) return false
    if (intervalo.inicio && iso < intervalo.inicio) return false
    if (intervalo.fim && iso > intervalo.fim) return false
    return true
  })
  return { dentro, fora: movs.length - dentro.length, total: movs.length }
}

/**
 * Piso de dados: descarta movimentos cuja data canônica é anterior ao piso ISO.
 * Movimento sem data parseável é mantido (não derrubar dado por falha de parse).
 * Usado para limitar tenants a um período mínimo (ver PISO_DADOS_POR_CLIENTE).
 */
export function aplicarPisoDados(
  movs: readonly Movimento[],
  pisoISO: string | null,
): readonly Movimento[] {
  if (!pisoISO) return movs
  return movs.filter((m) => {
    const iso = isoDeMov(m.data)
    return !iso || iso >= pisoISO
  })
}

export interface Cobertura {
  readonly comData: number
  readonly total: number
}

/** Quantos movimentos têm data utilizável no regime — base do aviso de qualidade. */
export function coberturaDatas(movs: readonly Movimento[], regime: Regime): Cobertura {
  const comData = movs.filter((m) => dataDoMovimento(m, regime)).length
  return { comData, total: movs.length }
}

/**
 * Janela imediatamente ANTERIOR com a mesma duração — base da análise horizontal
 * (período vs período equivalente). null quando a janela atual é aberta ("Tudo"):
 * sem recorte definido não existe "anterior" honesto.
 */
export function intervaloAnterior(i: Intervalo): Intervalo | null {
  if (!i.inicio || !i.fim) return null
  const ini = new Date(`${i.inicio}T00:00:00`)
  const fim = new Date(`${i.fim}T00:00:00`)
  const dias = Math.round((fim.getTime() - ini.getTime()) / 86_400_000) + 1
  const fimAnt = new Date(ini)
  fimAnt.setDate(fimAnt.getDate() - 1)
  const iniAnt = new Date(fimAnt)
  iniAnt.setDate(iniAnt.getDate() - (dias - 1))
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { inicio: iso(iniAnt), fim: iso(fimAnt) }
}

/**
 * Dias do período analisado — denominador de PMR/PMP. Janela fechada → diferença de
 * datas (inclusiva); aberta → amplitude real das datas dos movimentos no regime.
 */
export function diasDoPeriodo(movs: readonly Movimento[], intervalo: Intervalo, regime: Regime): number {
  const inicio = intervalo.inicio ?? extremo(movs, regime, 'min')
  const fim = intervalo.fim ?? extremo(movs, regime, 'max')
  if (!inicio || !fim) return 0
  const ms = new Date(fim).getTime() - new Date(inicio).getTime()
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}

function extremo(movs: readonly Movimento[], regime: Regime, qual: 'min' | 'max'): string | null {
  let melhor: string | null = null
  for (const m of movs) {
    const iso = dataDoMovimento(m, regime)
    if (!iso) continue
    if (!melhor || (qual === 'min' ? iso < melhor : iso > melhor)) melhor = iso
  }
  return melhor
}

const fmt = (a: number, m: number, d: number): string =>
  `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Hoje no fuso LOCAL como 'aaaa-mm-dd' — toISOString() é UTC e vira o dia às 21h BRT. */
export function hojeLocalIso(): string {
  const d = new Date()
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** Rótulo humano do intervalo: 'dd/mm/aaaa – dd/mm/aaaa' ou 'todo o histórico'. */
export function rotuloIntervalo(i: Intervalo): string {
  if (!i.inicio && !i.fim) return 'todo o histórico'
  const f = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '…')
  return `${f(i.inicio)} – ${f(i.fim)}`
}

const ultimoDiaMes = (a: number, m: number): number => new Date(a, m, 0).getDate()

function deslocarMes(a: number, m: number, delta: number): [number, number] {
  const total = a * 12 + (m - 1) + delta
  return [Math.floor(total / 12), (total % 12) + 1]
}

const MESES_PRESET: Readonly<Record<string, number>> = { '3m': 3, '6m': 6, '12m': 12 }

/** Intervalo concreto de um preset, ancorado em hojeIso ('aaaa-mm-dd'). */
export function intervaloDoPreset(preset: Preset, hojeIso: string): Intervalo {
  const ay = Number(hojeIso.slice(0, 4))
  const am = Number(hojeIso.slice(5, 7))
  if (preset === 'mes-atual') return { inicio: fmt(ay, am, 1), fim: fmt(ay, am, ultimoDiaMes(ay, am)) }
  if (preset === 'mes-anterior') {
    const [y, m] = deslocarMes(ay, am, -1)
    return { inicio: fmt(y, m, 1), fim: fmt(y, m, ultimoDiaMes(y, m)) }
  }
  if (preset === 'ano') return { inicio: fmt(ay, 1, 1), fim: fmt(ay, 12, 31) }
  const n = MESES_PRESET[preset]
  if (n) {
    const [y, m] = deslocarMes(ay, am, -(n - 1))
    return { inicio: fmt(y, m, 1), fim: fmt(ay, am, ultimoDiaMes(ay, am)) }
  }
  return INTERVALO_TUDO
}
