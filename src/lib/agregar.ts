/** @file Agregações de movimentos por categoria (totais e contagens). */
import type { Categoria, Natureza } from '@/core/categoria'
import type { Movimento } from '@/core/movimento'

export interface LinhaCategoria {
  readonly codigo: string
  readonly descricao: string
  readonly natureza: Natureza
  readonly quantidade: number
  readonly totalCentavos: number
}

/** Soma os movimentos por categoria e junta com o nome do plano de contas. */
export function porCategoria(
  movimentos: readonly Movimento[],
  categorias: readonly Categoria[],
): LinhaCategoria[] {
  const nomes = new Map(categorias.map((c) => [c.codigo, c]))
  const acc = new Map<string, { quantidade: number; totalCentavos: number }>()
  for (const m of movimentos) {
    const atual = acc.get(m.categoria) ?? { quantidade: 0, totalCentavos: 0 }
    atual.quantidade += 1
    atual.totalCentavos += m.valorCentavos
    acc.set(m.categoria, atual)
  }
  return [...acc.entries()]
    .map(([codigo, v]) => linha(codigo, v, nomes))
    .sort((a, b) => b.totalCentavos - a.totalCentavos)
}

function linha(
  codigo: string,
  v: { quantidade: number; totalCentavos: number },
  nomes: ReadonlyMap<string, Categoria>,
): LinhaCategoria {
  const cat = nomes.get(codigo)
  return {
    codigo,
    descricao: cat?.descricao ?? (codigo === 'SEM_CATEGORIA' ? 'Sem categoria' : codigo),
    natureza: cat?.natureza ?? 'outra',
    quantidade: v.quantidade,
    totalCentavos: v.totalCentavos,
  }
}
