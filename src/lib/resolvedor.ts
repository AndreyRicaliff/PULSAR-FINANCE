/** @file Resolve códigos crus (categoria/contraparte/título) em nomes, aplicando overrides. */
import type { CategoriasSeed } from '@/core/categoria'
import type { ClientesSeed } from '@/core/cliente'
import type { NomeResolvido, Overrides, Resolvedor } from '@/core/override'

function resolver(original: string, ajustado: string | undefined): NomeResolvido {
  const e = ajustado?.trim()
  return e ? { nome: e, original, editado: true } : { nome: original, original, editado: false }
}

/** Puro: cadastros chegam por parâmetro (runtime via useCadastros, não seed de build). */
export function criarResolvedor(
  ov: Overrides,
  categorias: CategoriasSeed['categorias'],
  clientes: ClientesSeed['clientes'],
): Resolvedor {
  const descCategoria = new Map(categorias.map((c) => [c.codigo, c.descricao]))
  const origemCategoria = (codigo: string): string => {
    if (!codigo || codigo === 'SEM_CATEGORIA') return 'Sem categoria'
    return descCategoria.get(codigo) ?? codigo
  }
  const origemContraparte = (codigo: string): string => {
    if (!codigo || codigo === 'SEM') return 'Sem contraparte'
    return clientes[codigo]?.nome ?? `Código ${codigo}`
  }
  return {
    categoria: (c) => resolver(origemCategoria(c), ov.categoria[c]),
    contraparte: (c) => resolver(origemContraparte(c), ov.contraparte[c]),
    titulo: (id, original) => resolver(original || 'Sem documento', ov.titulo[id]),
  }
}
