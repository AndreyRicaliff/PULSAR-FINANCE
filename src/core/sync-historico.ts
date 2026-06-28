/**
 * @file Tipos do histórico de sincronizações (doc cliente:<id>:sync-historico) e o
 * normalizador de boundary — o doc vem do Supabase (escrito pela edge function sync-omie),
 * então tudo passa por validação antes de chegar à UI. Espelha o shape gerado lá.
 */
export interface ResumoMov {
  readonly data: string
  readonly documento: string
  readonly contraparte: string
  readonly categoria: string
  readonly natureza: string
  readonly valorCentavos: number
}

export interface MudancaCampo {
  readonly campo: string
  readonly de: string | number
  readonly para: string | number
}

export interface MovAtualizado {
  readonly mov: ResumoMov
  readonly mudancas: readonly MudancaCampo[]
}

/** Lista de detalhe capada pelo servidor (DET_MAX) — truncamento sempre sinalizado. */
export interface ListaCapada<T> {
  readonly itens: readonly T[]
  readonly total: number
  readonly truncado: boolean
}

export interface ContagensSync {
  readonly novos: number
  readonly atualizados: number
  readonly removidos: number
}

export interface EntradaSync {
  readonly em: string
  readonly total: number
  readonly primeira: boolean
  readonly contagens: ContagensSync
  readonly detalhes: {
    readonly novos: ListaCapada<ResumoMov>
    readonly atualizados: ListaCapada<MovAtualizado>
    readonly removidos: ListaCapada<ResumoMov>
  }
}

const reg = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const escalar = (v: unknown): string | number => (typeof v === 'number' ? v : str(v))

function resumo(v: unknown): ResumoMov {
  const r = reg(v)
  return {
    data: str(r.data), documento: str(r.documento), contraparte: str(r.contraparte),
    categoria: str(r.categoria), natureza: str(r.natureza), valorCentavos: num(r.valorCentavos),
  }
}

function atualizado(v: unknown): MovAtualizado {
  const r = reg(v)
  const mudancas = Array.isArray(r.mudancas) ? r.mudancas.map(reg) : []
  return {
    mov: resumo(r.mov),
    mudancas: mudancas.map((m) => ({ campo: str(m.campo), de: escalar(m.de), para: escalar(m.para) })),
  }
}

function lista<T>(v: unknown, item: (x: unknown) => T): ListaCapada<T> {
  const r = reg(v)
  const itens = Array.isArray(r.itens) ? r.itens.map(item) : []
  return { itens, total: num(r.total) || itens.length, truncado: r.truncado === true }
}

function entrada(v: unknown): EntradaSync {
  const r = reg(v)
  const c = reg(r.contagens)
  const d = reg(r.detalhes)
  return {
    em: str(r.em),
    total: num(r.total),
    primeira: r.primeira === true,
    contagens: { novos: num(c.novos), atualizados: num(c.atualizados), removidos: num(c.removidos) },
    detalhes: {
      novos: lista(d.novos, resumo),
      atualizados: lista(d.atualizados, atualizado),
      removidos: lista(d.removidos, resumo),
    },
  }
}

/** Doc cru do Supabase → entradas válidas (entradas sem data são descartadas). */
export function normalizarHistorico(bruto: unknown): EntradaSync[] {
  const entradas = reg(bruto).entradas
  if (!Array.isArray(entradas)) return []
  return entradas.map(entrada).filter((e) => e.em !== '')
}
