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

export interface MatrizMesValor {
  readonly previstoCentavos: number
  readonly realizadoCentavos: number
}

export interface LinhaMatriz {
  readonly codigo: string
  readonly porMes: ReadonlyMap<string, MatrizMesValor>
  readonly totalPrevistoCentavos: number
  readonly totalRealizadoCentavos: number
}

export interface MatrizOrcado {
  /** Meses do recorte com dado no doc, ordenados ('aaaa-mm'). */
  readonly meses: readonly string[]
  readonly receitas: readonly LinhaMatriz[]
  readonly despesas: readonly LinhaMatriz[]
}

/** Pivot categoria × mês do doc de orçamento (matriz estilo DRE gerencial: colunas por mês). */
export function matrizOrcado(
  meses: Readonly<Record<string, readonly LinhaOrcamento[]>>,
  mesesAlvo: readonly string[],
): MatrizOrcado {
  const alvo = new Set(mesesAlvo)
  const porCategoria = new Map<string, Map<string, { p: number; r: number }>>()
  const mesesComDado = new Set<string>()
  for (const [mes, folhas] of Object.entries(meses)) {
    if (!alvo.has(mes)) continue
    for (const f of folhas) {
      if (f.previstoCentavos === 0 && f.realizadoCentavos === 0) continue
      mesesComDado.add(mes)
      const porMes = porCategoria.get(f.categoria) ?? new Map<string, { p: number; r: number }>()
      const a = porMes.get(mes) ?? { p: 0, r: 0 }
      a.p += f.previstoCentavos
      a.r += f.realizadoCentavos
      porMes.set(mes, a)
      porCategoria.set(f.categoria, porMes)
    }
  }
  const ordenados = [...mesesComDado].sort()
  const linhasDe = (prefixo: string): LinhaMatriz[] =>
    [...porCategoria.entries()]
      .filter(([codigo]) => codigo.startsWith(prefixo))
      .map(([codigo, porMes]) => {
        const mapa = new Map<string, MatrizMesValor>()
        let tp = 0
        let tr = 0
        for (const [mes, v] of porMes) {
          mapa.set(mes, { previstoCentavos: v.p, realizadoCentavos: v.r })
          tp += v.p
          tr += v.r
        }
        return { codigo, porMes: mapa, totalPrevistoCentavos: tp, totalRealizadoCentavos: tr }
      })
      .sort((a, b) => Math.abs(b.totalPrevistoCentavos) - Math.abs(a.totalPrevistoCentavos))
  return { meses: ordenados, receitas: linhasDe('1'), despesas: linhasDe('2') }
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
