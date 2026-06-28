/**
 * @file Categoria do plano de contas (modelo canônico, agnóstico de ERP).
 * Compartilhado entre o script de sync (server) e o painel (browser).
 */
export type Natureza = 'receita' | 'despesa' | 'transferencia' | 'outra'

export interface Categoria {
  readonly codigo: string
  readonly descricao: string
  readonly natureza: Natureza
  readonly paiCodigo: string | null
  readonly agrupadora: boolean
  readonly ativa: boolean
  readonly entraNoDre: boolean
}

export interface RelatorioCategorias {
  readonly total: number
  readonly porNatureza: Readonly<Record<Natureza, number>>
  readonly agrupadoras: number
  readonly analiticas: number
  readonly inativas: number
}

export interface CategoriasSeed {
  readonly geradoEm: string
  readonly relatorio: RelatorioCategorias
  readonly categorias: readonly Categoria[]
}
