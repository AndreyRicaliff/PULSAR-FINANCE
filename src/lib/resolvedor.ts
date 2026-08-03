/** @file Resolve códigos crus (categoria/contraparte/título) em nomes, aplicando overrides. */
import type { CategoriasSeed } from '@/core/categoria'
import { nomeContraparte, type ClientesSeed } from '@/core/cliente'
import { estadoDoNome } from '@/core/estadoRegistro'
import type { NomeResolvido, Overrides, Resolvedor } from '@/core/override'

function resolver(original: string, ajustado: string | undefined): NomeResolvido {
  const e = ajustado?.trim()
  // Etiqueta de estado ("(EXCLUÍDO)" etc.) detectada no nome EXIBIDO — assim o renome
  // manual controla a etiqueta: limpar o nome tira o estado, escrevê-lo de volta o põe.
  const { limpo, estado } = estadoDoNome(e || original)
  const base = e ? { nome: limpo, original, editado: true as const } : { nome: limpo, original, editado: false as const }
  return estado ? { ...base, estado } : base
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
  const origemContraparte = (codigo: string): string => nomeContraparte(codigo, clientes)
  return {
    categoria: (c) => resolver(origemCategoria(c), ov.categoria[c]),
    contraparte: (c) => resolver(origemContraparte(c), ov.contraparte[c]),
    titulo: (id, original) => resolver(original || 'Sem documento', ov.titulo[id]),
  }
}
