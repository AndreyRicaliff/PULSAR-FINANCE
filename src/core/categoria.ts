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
export function rotuloCategoria(codigo: string, descricao: string, separador = ' '): string {
  // Resolvedores caem no próprio código quando não há descrição — não duplicar ('2.01 2.01').
  const desc = descricao === codigo ? '' : descricao
  return [codigoExibivel(codigo), desc].filter(Boolean).join(separador).trim() || codigo
}

/**
 * Profundidade hierárquica pela cadeia paiCodigo (vale p/ Omie e Nibo — GUID não tem
 * pontos, então contar níveis do código achataria o plano Nibo). Pai fora do plano = raiz.
 */
export function mapaProfundidade(categorias: readonly Categoria[]): ReadonlyMap<string, number> {
  const pai = new Map(categorias.map((c) => [c.codigo, c.paiCodigo]))
  const prof = new Map<string, number>()
  const resolver = (codigo: string): number => {
    const memo = prof.get(codigo)
    if (memo !== undefined) return memo
    prof.set(codigo, 0) // corta ciclo de paiCodigo corrompido
    const p = pai.get(codigo)
    const v = p && pai.has(p) ? resolver(p) + 1 : 0
    prof.set(codigo, v)
    return v
  }
  for (const c of categorias) resolver(c.codigo)
  return prof
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
