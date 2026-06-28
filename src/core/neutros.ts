/**
 * @file Separação de movimentos neutros (Regra Mãe: transferências, aportes, estornos).
 * Neutro nunca entra em DRE/DFC/gráficos — mas precisa ser auditável num relatório próprio.
 * Mesmo critério do serieMensal: o nó conciliado do movimento tem meta.neutra.
 */
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'

export interface SplitNeutros {
  readonly operacionais: readonly Movimento[]
  readonly neutros: readonly Movimento[]
}

export function separarNeutros(movs: readonly Movimento[], conc: Conciliacao): SplitNeutros {
  const neutros: Movimento[] = []
  const operacionais: Movimento[] = []
  const meta = new Map(conc.estrutura.map((n) => [n.id, n.meta]))
  for (const m of movs) {
    const noId = conc.mapa[m.categoria]
    if (noId && meta.get(noId)?.neutra) neutros.push(m)
    else operacionais.push(m)
  }
  return { operacionais, neutros }
}
