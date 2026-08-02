/**
 * @file Adesão do CAPEX vs orçamento de caixa: previsto/realizado das CATEGORIAS
 * conciliadas nos nós marcados (meta.capex), por balde. Só há dado quando o provedor
 * produz orçamento (Omie) — quem renderiza decide esconder.
 */
import { capexDoNo } from '@/core/capex'
import type { Conciliacao, TipoCapex } from '@/core/modelo'
import type { LinhaOrcamento } from './useOrcamento'

export interface AdesaoLado {
  readonly previstoCentavos: number
  readonly realizadoCentavos: number
}

export interface AdesaoCapex {
  readonly investimento: AdesaoLado
  readonly manutencao: AdesaoLado
}

export function adesaoCapex(
  meses: Readonly<Record<string, readonly LinhaOrcamento[]>>,
  mesesAlvo: readonly string[],
  conc: Conciliacao,
): AdesaoCapex {
  const noPorId = new Map(conc.estrutura.map((n) => [n.id, n]))
  const tipoPorCategoria = new Map<string, TipoCapex>()
  for (const [categoria, noId] of Object.entries(conc.mapa)) {
    const no = noPorId.get(noId)
    if (!no) continue
    const tipo = capexDoNo(no, no.paiId ? noPorId.get(no.paiId) : undefined)
    if (tipo) tipoPorCategoria.set(categoria, tipo)
  }

  const alvo = new Set(mesesAlvo)
  const acc: Record<TipoCapex, { previsto: number; realizado: number }> = {
    investimento: { previsto: 0, realizado: 0 },
    manutencao: { previsto: 0, realizado: 0 },
  }
  for (const [mes, folhas] of Object.entries(meses)) {
    if (!alvo.has(mes)) continue
    for (const f of folhas) {
      const tipo = tipoPorCategoria.get(f.categoria)
      if (!tipo) continue
      acc[tipo].previsto += f.previstoCentavos
      acc[tipo].realizado += f.realizadoCentavos
    }
  }
  return {
    investimento: { previstoCentavos: acc.investimento.previsto, realizadoCentavos: acc.investimento.realizado },
    manutencao: { previstoCentavos: acc.manutencao.previsto, realizadoCentavos: acc.manutencao.realizado },
  }
}
