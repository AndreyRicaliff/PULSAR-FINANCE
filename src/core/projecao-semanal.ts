/**
 * @file Fluxo de caixa semanal Previsto × Realizado por nó da estrutura.
 * Previsto = títulos em aberto pelo vencimento; Realizado = movimentos pagos pelo pagamento.
 * Granularidade base = DIA (drill); a UI agrega por semana. Núcleo puro.
 */
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import { isoDeMov } from './periodo'
import { A_CONCILIAR, grupoDoTitulo } from './projecao'
import { estaAberto, type Titulo } from './titulo'

export interface Dia {
  readonly iso: string
  readonly rotulo: string
}

export interface Semana {
  readonly id: string
  readonly rotulo: string
  readonly dias: readonly Dia[]
}

export interface Fluxo {
  readonly prevEntrada: number
  readonly prevSaida: number
  readonly realEntrada: number
  readonly realSaida: number
}

export const FLUXO_ZERO: Fluxo = { prevEntrada: 0, prevSaida: 0, realEntrada: 0, realSaida: 0 }

const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

/** Semanas (segunda→domingo) que cobrem o mês 'aaaa-mm', cada uma com seus dias. */
export function montarSemanas(mes: string): Semana[] {
  const [ano, m] = mes.split('-').map(Number)
  if (!ano || !m) return []
  const ultimo = new Date(ano, m, 0).getDate()
  const semanas: Semana[] = []
  let dias: Dia[] = []
  for (let d = 1; d <= ultimo; d++) {
    const date = new Date(ano, m - 1, d)
    const dd = String(d).padStart(2, '0')
    dias.push({ iso: `${mes}-${dd}`, rotulo: `${DIAS_SEM[date.getDay()]} ${dd}` })
    if (date.getDay() === 0 || d === ultimo) {
      const n = semanas.length + 1
      semanas.push({ id: `s${n}`, rotulo: `Semana ${n}`, dias })
      dias = []
    }
  }
  return semanas
}

function soma(a: Fluxo, b: Partial<Fluxo>): Fluxo {
  return {
    prevEntrada: a.prevEntrada + (b.prevEntrada ?? 0),
    prevSaida: a.prevSaida + (b.prevSaida ?? 0),
    realEntrada: a.realEntrada + (b.realEntrada ?? 0),
    realSaida: a.realSaida + (b.realSaida ?? 0),
  }
}

/** nodeId → (diaIso → Fluxo). nodeId é grupo ou subgrupo da conciliação, ou A_CONCILIAR. */
export function fluxoDiario(
  titulos: readonly Titulo[],
  movimentos: readonly Movimento[],
  conc: Conciliacao,
): Map<string, Map<string, Fluxo>> {
  const out = new Map<string, Map<string, Fluxo>>()
  const lanc = (noId: string, dia: string, delta: Partial<Fluxo>) => {
    const porDia = out.get(noId) ?? new Map<string, Fluxo>()
    porDia.set(dia, soma(porDia.get(dia) ?? FLUXO_ZERO, delta))
    out.set(noId, porDia)
  }
  for (const t of titulos) {
    if (!estaAberto(t)) continue
    const dia = isoDeMov(t.dataVencimento || t.dataPrevisao)
    if (!dia) continue
    const noId = grupoDoTitulo(t, conc) ?? A_CONCILIAR
    lanc(noId, dia, t.natureza === 'R' ? { prevEntrada: t.valorCentavos } : { prevSaida: t.valorCentavos })
  }
  for (const m of movimentos) {
    const pago = m.valorPagoCentavos ?? 0
    if (pago <= 0) continue
    const dia = isoDeMov(m.dataPagamento ?? '')
    if (!dia) continue
    const noId = conc.mapa[m.categoria] ?? A_CONCILIAR
    lanc(noId, dia, m.natureza.toUpperCase() === 'R' ? { realEntrada: pago } : { realSaida: pago })
  }
  return out
}

/** Agrega o Fluxo de um nó sobre um conjunto de dias (ex.: uma semana, ou o mês todo). */
export function fluxoNoPeriodo(porDia: ReadonlyMap<string, Fluxo> | undefined, dias: readonly string[]): Fluxo {
  if (!porDia) return FLUXO_ZERO
  return dias.reduce((acc, d) => soma(acc, porDia.get(d) ?? {}), FLUXO_ZERO)
}

/** Resultado líquido (entrada − saída) de um lado. */
export const liquidoPrevisto = (f: Fluxo): number => f.prevEntrada - f.prevSaida
export const liquidoRealizado = (f: Fluxo): number => f.realEntrada - f.realSaida
