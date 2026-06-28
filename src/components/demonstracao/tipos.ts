/** @file Tipos compartilhados do editor de demonstração + catálogo de chaves (grupo/override). */
import type { SubgrupoArvore } from '@/core/classes'
import type { LinhaCalc } from '@/core/demonstracao'

/** Ações de customização por camada (subgrupo/classe → linha). Ausente = drill read-only. */
export interface AcoesArvore {
  readonly entradas: readonly LinhaCalc[]
  readonly mapaSub: Readonly<Record<string, string>>
  readonly mapaClasse: Readonly<Record<string, string>>
  readonly onAlocarSub: (subId: string, linhaId: string) => void
  readonly onAlocarClasse: (classeCod: string, linhaId: string) => void
  /** Abre o detalhe (lupa) dos movimentos de uma classe DENTRO de um subgrupo (subId). */
  readonly onDetalheClasse: (codigo: string, nome: string, subId: string) => void
}

export interface GrupoAlocavel {
  readonly id: string
  readonly nome: string
  readonly totalCentavos: number
  /** Grupo neutro (Regra Mãe): nunca alocável numa linha — fica sempre a conciliar. */
  readonly neutra?: boolean
  /** Subgrupos (com suas classes) que compõem o grupo — drill da estrutura. */
  readonly arvore?: readonly SubgrupoArvore[]
}

export interface Comparacao {
  /** valor padrão (imutável) por linha. */
  readonly valorPadrao: ReadonlyMap<string, number>
  /** alocação padrão grupo→linha. */
  readonly mapaPadrao: Readonly<Record<string, string>>
  /** id da linha → nome (para tooltip do padrão). */
  readonly nomeLinha: ReadonlyMap<string, string>
}

/** Catálogo id→grupo + chaves de override (sub:/cls:) da árvore, para os chips mostrarem nome+valor. */
export function catalogoComOverrides(grupos: readonly GrupoAlocavel[]): Map<string, GrupoAlocavel> {
  const m = new Map<string, GrupoAlocavel>()
  for (const g of grupos) {
    m.set(g.id, g)
    for (const s of g.arvore ?? []) {
      m.set(`sub:${s.id}`, { id: `sub:${s.id}`, nome: `↳ ${s.nome}`, totalCentavos: s.totalCentavos })
      for (const c of s.classes) m.set(`cls:${c.codigo}`, { id: `cls:${c.codigo}`, nome: `· ${c.nome}`, totalCentavos: c.totalCentavos })
    }
  }
  return m
}
