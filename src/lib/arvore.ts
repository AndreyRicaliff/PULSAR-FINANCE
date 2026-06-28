/** @file Montagem da árvore de categorias Omie (pai → filhos). */
import type { Categoria, Natureza } from '@/core/categoria'
import type { Movimento } from '@/core/movimento'

export interface NoCategoria {
  readonly codigo: string
  readonly descricao: string
  readonly natureza: Natureza
  /** Valor dos movimentos lançados DIRETO nesta categoria. */
  readonly proprioCentavos: number
  readonly proprioQtd: number
  /** Valor consolidado: próprio + todos os descendentes. */
  readonly totalCentavos: number
  readonly quantidade: number
  readonly filhos: readonly NoCategoria[]
}

interface NoMutavel {
  codigo: string
  descricao: string
  natureza: Natureza
  proprioCentavos: number
  proprioQtd: number
  paiCodigo: string | null
  filhos: NoMutavel[]
}

/** Monta a árvore do plano de contas com subtotais rolando do filho pro pai. */
export function montarArvore(
  movimentos: readonly Movimento[],
  categorias: readonly Categoria[],
): NoCategoria[] {
  const direto = somarDireto(movimentos)
  const nodes = criarNodes(categorias, direto)
  vincular(nodes)
  const raizes = [...nodes.values()].filter((n) => !n.paiCodigo || !nodes.has(n.paiCodigo))
  return raizes.map(consolidar).filter((n) => n.totalCentavos > 0).sort(porValor)
}

function somarDireto(
  movimentos: readonly Movimento[],
): Map<string, { centavos: number; qtd: number }> {
  const acc = new Map<string, { centavos: number; qtd: number }>()
  for (const m of movimentos) {
    const atual = acc.get(m.categoria) ?? { centavos: 0, qtd: 0 }
    atual.centavos += m.valorCentavos
    atual.qtd += 1
    acc.set(m.categoria, atual)
  }
  return acc
}

function criarNodes(
  categorias: readonly Categoria[],
  direto: ReadonlyMap<string, { centavos: number; qtd: number }>,
): Map<string, NoMutavel> {
  const nodes = new Map<string, NoMutavel>()
  for (const c of categorias) {
    const d = direto.get(c.codigo)
    nodes.set(c.codigo, {
      codigo: c.codigo,
      descricao: c.descricao,
      natureza: c.natureza,
      proprioCentavos: d?.centavos ?? 0,
      proprioQtd: d?.qtd ?? 0,
      paiCodigo: c.paiCodigo,
      filhos: [],
    })
  }
  // Códigos com movimento mas fora do plano: cria nó sintético (pai derivado do código).
  for (const [codigo, d] of direto) {
    if (nodes.has(codigo)) continue
    nodes.set(codigo, {
      codigo,
      descricao: codigo === 'SEM_CATEGORIA' ? 'Sem categoria' : codigo,
      natureza: 'outra',
      proprioCentavos: d.centavos,
      proprioQtd: d.qtd,
      paiCodigo: paiDerivado(codigo),
      filhos: [],
    })
  }
  return nodes
}

function paiDerivado(codigo: string): string | null {
  const partes = codigo.split('.')
  return partes.length > 1 ? partes.slice(0, -1).join('.') : null
}

function vincular(nodes: Map<string, NoMutavel>): void {
  for (const node of nodes.values()) {
    if (!node.paiCodigo) continue
    const pai = nodes.get(node.paiCodigo)
    if (pai) pai.filhos.push(node)
  }
}

function consolidar(no: NoMutavel): NoCategoria {
  const filhos = no.filhos.map(consolidar).filter((f) => f.totalCentavos > 0).sort(porValor)
  const totalCentavos = no.proprioCentavos + filhos.reduce((acc, f) => acc + f.totalCentavos, 0)
  const quantidade = no.proprioQtd + filhos.reduce((acc, f) => acc + f.quantidade, 0)
  return {
    codigo: no.codigo,
    descricao: no.descricao,
    natureza: no.natureza,
    proprioCentavos: no.proprioCentavos,
    proprioQtd: no.proprioQtd,
    totalCentavos,
    quantidade,
    filhos,
  }
}

function porValor(a: NoCategoria, b: NoCategoria): number {
  return b.totalCentavos - a.totalCentavos
}

export function semCancelados(movimentos: readonly Movimento[]): Movimento[] {
  return movimentos.filter((m) => !m.status.toUpperCase().includes('CANCEL'))
}
