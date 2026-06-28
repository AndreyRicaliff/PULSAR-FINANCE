import type { Categoria, Natureza } from '../../src/core/categoria.ts'

// A Omie referencia as raízes 0/1/2 como pai mas não as devolve na listagem.
// Sintetizamos aqui para a árvore fechar (todo filho tem pai).
const ROTULO_RAIZ: Readonly<Record<string, string>> = {
  '0': 'Transferências',
  '1': 'Receitas',
  '2': 'Despesas',
}

export function completarRaizes(categorias: readonly Categoria[]): Categoria[] {
  const existentes = new Set(categorias.map((c) => c.codigo))
  const sintetizadas = new Map<string, Categoria>()
  for (const c of categorias) {
    const pai = c.paiCodigo
    if (pai && !existentes.has(pai) && !sintetizadas.has(pai)) {
      sintetizadas.set(pai, criarRaiz(pai, c.natureza))
    }
  }
  return [...sintetizadas.values(), ...categorias]
}

function criarRaiz(codigo: string, natureza: Natureza): Categoria {
  return {
    codigo,
    descricao: ROTULO_RAIZ[codigo] ?? `Raiz ${codigo}`,
    natureza,
    paiCodigo: null,
    agrupadora: true,
    ativa: true,
    entraNoDre: false,
  }
}
