/**
 * @file Histórico de edição de nomes (categoria/contraparte/título) — trilha por tenant.
 * Cada renome/restauração vira um evento imutável com timestamp; `de`/`para` null
 * significam "o original do ERP" (override ausente). O teto descarta os eventos mais
 * antigos — trilha de navegação ("de onde veio esse nome?"), não log contábil.
 */
import type { EntidadeEditavel } from './override'

export interface EdicaoNome {
  /** ISO com hora — ordenável lexicograficamente. */
  readonly t: string
  readonly entidade: EntidadeEditavel
  readonly codigo: string
  /** Override anterior; null = exibia o original do ERP. */
  readonly de: string | null
  /** Novo override; null = restaurado ao original do ERP. */
  readonly para: string | null
}

export interface HistoricoEdicoes {
  readonly eventos: readonly EdicaoNome[]
}

export const HISTORICO_VAZIO: HistoricoEdicoes = { eventos: [] }

const TETO_PADRAO = 300

export function normalizarHistorico(bruto: unknown): HistoricoEdicoes {
  const h = (bruto ?? {}) as Partial<HistoricoEdicoes>
  return { eventos: Array.isArray(h.eventos) ? h.eventos : [] }
}

/** Registra um evento (no-op se nada mudou); estoura o teto descartando os mais antigos. */
export function registrarEdicao(h: HistoricoEdicoes, evento: EdicaoNome, teto = TETO_PADRAO): HistoricoEdicoes {
  if ((evento.de ?? '') === (evento.para ?? '')) return h
  const eventos = [...h.eventos, evento]
  return { eventos: eventos.length > teto ? eventos.slice(eventos.length - teto) : eventos }
}

/** Eventos de uma entidade+código, mais recente primeiro. */
export function edicoesDe(h: HistoricoEdicoes, entidade: EntidadeEditavel, codigo: string): EdicaoNome[] {
  return h.eventos.filter((e) => e.entidade === entidade && e.codigo === codigo).reverse()
}
