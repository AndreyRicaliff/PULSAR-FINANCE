/** @file Filtros por campo cru do movimento (natureza/status/origem/liquidado). */
import type { Movimento } from '@/core/movimento'

export type CampoFiltro = 'natureza' | 'status' | 'origem' | 'liquidado'

export type Filtros = Readonly<Record<CampoFiltro, string>>

export const CAMPOS_FILTRO: readonly CampoFiltro[] = ['natureza', 'status', 'origem', 'liquidado']

export const FILTROS_VAZIOS: Filtros = { natureza: '', status: '', origem: '', liquidado: '' }

export function temFiltro(f: Filtros): boolean {
  return CAMPOS_FILTRO.some((c) => f[c] !== '')
}

export function aplicarFiltros(movs: readonly Movimento[], f: Filtros): Movimento[] {
  return movs.filter((m) => CAMPOS_FILTRO.every((c) => !f[c] || m[c] === f[c]))
}

export function valoresDistintos(movs: readonly Movimento[], campo: CampoFiltro): string[] {
  return [...new Set(movs.map((m) => m[campo]).filter(Boolean))].sort()
}
