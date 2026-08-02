/**
 * @file Agregação Orçado × Atual POR CATEGORIA a partir do doc de orçamento (Omie).
 * Natureza pelo prefixo do plano hierárquico: '1' = receita, '2' = despesa — só o Omie
 * produz orçamento (mesma regra documentada em RelatorioPrevistoRealizado.montarLinhas);
 * prefixo fora de 1/2 (transferência) fica fora, como lá.
 */
import type { LinhaOrcamento } from './useOrcamento'

export interface LinhaCategoria {
  readonly codigo: string
  readonly previstoCentavos: number
  readonly realizadoCentavos: number
}

export interface OrcadoPorLado {
  readonly linhas: readonly LinhaCategoria[]
  readonly previstoCentavos: number
  readonly realizadoCentavos: number
}

export interface OrcadoCategorias {
  readonly receitas: OrcadoPorLado
  readonly despesas: OrcadoPorLado
}

/** Soma previsto/realizado por categoria nos meses do recorte e separa receitas × despesas. */
export function agregarOrcadoPorCategoria(
  meses: Readonly<Record<string, readonly LinhaOrcamento[]>>,
  mesesAlvo: readonly string[],
): OrcadoCategorias {
  const alvo = new Set(mesesAlvo)
  const acc = new Map<string, { previsto: number; realizado: number }>()
  for (const [mes, folhas] of Object.entries(meses)) {
    if (!alvo.has(mes)) continue
    for (const f of folhas) {
      const a = acc.get(f.categoria) ?? { previsto: 0, realizado: 0 }
      a.previsto += f.previstoCentavos
      a.realizado += f.realizadoCentavos
      acc.set(f.categoria, a)
    }
  }
  return { receitas: lado(acc, '1'), despesas: lado(acc, '2') }
}

function lado(acc: ReadonlyMap<string, { previsto: number; realizado: number }>, prefixo: string): OrcadoPorLado {
  const linhas = [...acc.entries()]
    .filter(([codigo]) => codigo.startsWith(prefixo))
    .map(([codigo, v]) => ({ codigo, previstoCentavos: v.previsto, realizadoCentavos: v.realizado }))
    .filter((l) => l.previstoCentavos !== 0 || l.realizadoCentavos !== 0)
    .sort((a, b) => Math.abs(b.previstoCentavos) - Math.abs(a.previstoCentavos))
  return {
    linhas,
    previstoCentavos: linhas.reduce((s, l) => s + l.previstoCentavos, 0),
    realizadoCentavos: linhas.reduce((s, l) => s + l.realizadoCentavos, 0),
  }
}

/** % de execução (realizado/previsto), inteiro; null quando não há orçamento como base. */
export function pctExecucao(realizadoCentavos: number, previstoCentavos: number): number | null {
  if (previstoCentavos <= 0) return null
  return Math.round((realizadoCentavos / previstoCentavos) * 100)
}

/** Receita atingir/passar o orçado é bom; despesa passar é ruim. null = sem base de comparação. */
export function dentroDoOrcado(natureza: 'R' | 'P', pct: number | null): boolean | null {
  if (pct === null) return null
  return natureza === 'R' ? pct >= 100 : pct <= 100
}
