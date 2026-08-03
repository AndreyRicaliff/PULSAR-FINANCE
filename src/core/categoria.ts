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
  // 'man:' = categoria criada manualmente no painel (core/categoriaManual) — o código é
  // uuid interno, tão opaco quanto o GUID Nibo: não exibir.
  if (codigo.startsWith('man:')) return ''
  return RE_CODIGO_OPACO.test(codigo) ? '' : codigo
}

/**
 * Descrições que se repetem em códigos DISTINTOS — precisam do código para desambiguar.
 * Ex.: no plano Omie "IOF" existe em 2.05.03 e 2.06.95; sem isso as duas viram a mesma linha.
 * Chave normalizada (trim + lower) para casar "IOF" e "iof " como o mesmo nome.
 */
export function descricoesAmbiguas(categorias: readonly Pick<Categoria, 'codigo' | 'descricao'>[]): ReadonlySet<string> {
  const porDesc = new Map<string, Set<string>>()
  for (const c of categorias) {
    const d = c.descricao.trim().toLowerCase()
    if (!d) continue
    const cods = porDesc.get(d) ?? new Set<string>()
    cods.add(c.codigo)
    porDesc.set(d, cods)
  }
  const ambiguas = new Set<string>()
  for (const [d, cods] of porDesc) if (cods.size > 1) ambiguas.add(d)
  return ambiguas
}

/**
 * Nome humano da categoria: SÓ a descrição. O código (Omie hierárquico '2.03.05' ou GUID
 * Nibo) é chave interna e NÃO entra no nome — colá-lo dava "2.03.05 13º Salário" na tela
 * (reclamação de 2026-07-24). Onde o código Omie é útil (Plano de Contas, Lançamentos), ele
 * aparece como elemento PRÓPRIO via `codigoExibivel`, nunca grudado no nome.
 *
 * `ambiguas` (opcional): quando a descrição colide com outra categoria, sufixa o código
 * legível — "IOF (2.05.03)" — para o financeiro não ver duas linhas idênticas na Matriz.
 * Sem o set, é sempre nome-puro (caller sem acesso ao cadastro).
 * Fallback quando não há descrição: código legível (Omie) ou o próprio código (GUID).
 */
export function rotuloCategoria(codigo: string, descricao: string, ambiguas?: ReadonlySet<string>): string {
  const desc = descricao.trim()
  if (!desc || desc === codigo) return codigoExibivel(codigo) || codigo
  const cod = codigoExibivel(codigo)
  if (cod && ambiguas?.has(desc.toLowerCase())) return `${desc} (${cod})`
  return desc
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
