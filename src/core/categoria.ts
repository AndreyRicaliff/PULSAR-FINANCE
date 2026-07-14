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

const RE_CODIGO_OPACO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Código que vale mostrar ao usuário: Omie usa código hierárquico curto ('2.01.03');
 * Nibo usa GUID — chave interna estável, sem significado humano → não exibir.
 */
export function codigoExibivel(codigo: string): string {
  return RE_CODIGO_OPACO.test(codigo) ? '' : codigo
}

/** Rótulo humano da categoria: 'código descrição' quando o código é legível; só a descrição quando opaco. */
export function rotuloCategoria(codigo: string, descricao: string): string {
  return [codigoExibivel(codigo), descricao].filter(Boolean).join(' ').trim() || codigo
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
