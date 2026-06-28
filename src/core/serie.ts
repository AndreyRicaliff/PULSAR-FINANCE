/**
 * @file Série temporal mensal e projeção. Núcleo puro.
 * A série é contínua (meses sem movimento entram zerados) para alimentar evolução e previsão.
 * Projeção é SEMPRE estimativa (projetado=true) — nunca confundir com dado real.
 */
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import { dataDoMovimento, type Regime } from './periodo'

export type MetodoProj = 'linear' | 'media-movel'

export interface PontoSerie {
  readonly mes: string // 'aaaa-mm'
  readonly rotulo: string // 'mm/aa'
  readonly entrada: number
  readonly saida: number
  readonly saldo: number
  readonly projetado: boolean
}

interface Acc {
  entrada: number
  saida: number
}

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`

function acumular(movs: readonly Movimento[], conc: Conciliacao, regime: Regime): Map<string, Acc> {
  const idx = new Map(conc.estrutura.map((n) => [n.id, n]))
  const acc = new Map<string, Acc>()
  for (const m of movs) {
    const no = idx.get(conc.mapa[m.categoria] ?? '')
    if (!no || no.meta?.neutra) continue
    const iso = dataDoMovimento(m, regime)
    if (!iso) continue
    const mes = iso.slice(0, 7)
    const a = acc.get(mes) ?? { entrada: 0, saida: 0 }
    if (m.natureza.toUpperCase() === 'R') a.entrada += Math.abs(m.valorCentavos)
    else a.saida += Math.abs(m.valorCentavos)
    acc.set(mes, a)
  }
  return acc
}

function mesesContinuos(de: string, ate: string): string[] {
  const meses: string[] = []
  let [a, m] = [Number(de.slice(0, 4)), Number(de.slice(5, 7))]
  const [fa, fm] = [Number(ate.slice(0, 4)), Number(ate.slice(5, 7))]
  while (a < fa || (a === fa && m <= fm)) {
    meses.push(`${a}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) ((m = 1), (a += 1))
  }
  return meses
}

/** Série mensal contínua (entrada/saída/saldo) dos movimentos conciliados, no regime dado. */
export function serieMensal(movs: readonly Movimento[], conc: Conciliacao, regime: Regime): PontoSerie[] {
  const acc = acumular(movs, conc, regime)
  const chaves = [...acc.keys()].sort()
  const primeiro = chaves[0]
  const ultimo = chaves[chaves.length - 1]
  if (!primeiro || !ultimo) return []
  return mesesContinuos(primeiro, ultimo).map((mes) => {
    const a = acc.get(mes) ?? { entrada: 0, saida: 0 }
    return { mes, rotulo: rotuloMes(mes), entrada: a.entrada, saida: a.saida, saldo: a.entrada - a.saida, projetado: false }
  })
}

export interface Crescimento {
  /** Variação do último mês vs o anterior (fração; 0.12 = +12%). null = sem base. */
  readonly mom: number | null
  /** Variação vs mesmo mês do ano anterior. null = histórico insuficiente. */
  readonly yoy: number | null
}

/** Crescimento MoM/YoY sobre a série HISTÓRICA (projeção fica fora). Espec §7 (KPIs). */
export function crescimento(serie: readonly PontoSerie[], campo: 'entrada' | 'saida' | 'saldo'): Crescimento {
  const hist = serie.filter((p) => !p.projetado)
  const ultimo = hist[hist.length - 1]
  const anterior = hist[hist.length - 2]
  const anoAtras = ultimo ? hist.find((p) => p.mes === mesMenos(ultimo.mes, 12)) : undefined
  return {
    mom: variacaoFrac(ultimo?.[campo], anterior?.[campo]),
    yoy: variacaoFrac(ultimo?.[campo], anoAtras?.[campo]),
  }
}

function variacaoFrac(atual: number | undefined, base: number | undefined): number | null {
  if (atual === undefined || base === undefined || base === 0) return null
  return (atual - base) / Math.abs(base)
}

function mesMenos(mes: string, delta: number): string {
  const total = Number(mes.slice(0, 4)) * 12 + (Number(mes.slice(5, 7)) - 1) - delta
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

function regressaoLinear(ys: readonly number[]): { a: number; b: number } {
  const n = ys.length
  const mx = (n - 1) / 2
  const my = ys.reduce((s, y) => s + y, 0) / n
  let num = 0
  let den = 0
  ys.forEach((y, i) => {
    num += (i - mx) * (y - my)
    den += (i - mx) ** 2
  })
  const b = den ? num / den : 0
  return { a: my - b * mx, b }
}

const mediaUltimos = (ys: readonly number[], n: number): number => {
  const corte = ys.slice(Math.max(0, ys.length - n))
  return corte.length ? corte.reduce((s, y) => s + y, 0) / corte.length : 0
}

function prever(ys: readonly number[], metodo: MetodoProj, i: number): number {
  if (metodo === 'linear') {
    const { a, b } = regressaoLinear(ys)
    return Math.round(a + b * i)
  }
  return Math.round(mediaUltimos(ys, 3))
}

function proximoMes(mes: string): string {
  let a = Number(mes.slice(0, 4))
  let m = Number(mes.slice(5, 7)) + 1
  if (m > 12) ((m = 1), (a += 1))
  return `${a}-${String(m).padStart(2, '0')}`
}

/** Estende a série por `horizonte` meses. Pontos projetados marcados (projetado=true). */
export function projetar(serie: readonly PontoSerie[], metodo: MetodoProj, horizonte: number): PontoSerie[] {
  if (serie.length < 2) return []
  const entradas = serie.map((p) => p.entrada)
  const saidas = serie.map((p) => p.saida)
  const out: PontoSerie[] = []
  let mes = serie[serie.length - 1]!.mes
  for (let k = 0; k < horizonte; k++) {
    const i = serie.length + k
    mes = proximoMes(mes)
    const entrada = Math.max(0, prever(entradas, metodo, i))
    const saida = Math.max(0, prever(saidas, metodo, i))
    out.push({ mes, rotulo: rotuloMes(mes), entrada, saida, saldo: entrada - saida, projetado: true })
  }
  return out
}
