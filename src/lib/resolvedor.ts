/** @file Resolve códigos crus (categoria/contraparte/título) em nomes, aplicando overrides. */
import type { CategoriasSeed } from '@/core/categoria'
import { nomeContraparte, type ClientesSeed } from '@/core/cliente'
import { estadoDoNome, type EstadoRegistro } from '@/core/estadoRegistro'
import type { NomeResolvido, Overrides, Resolvedor } from '@/core/override'

function resolver(original: string, ajustado: string | undefined, estrutural?: EstadoRegistro): NomeResolvido {
  const e = ajustado?.trim()
  // Etiqueta TEXTUAL ("(EXCLUÍDO)" no nome) é controle manual e vence; o ESTRUTURAL vem
  // do cadastro do ERP (ativa=false, código sumido) — é como a Omie marca de verdade
  // (278 categorias inativas em 8 tenants, validado em prod 03/08).
  const { limpo, estado } = estadoDoNome(e || original)
  const efetivo = estado ?? estrutural
  const base = e ? { nome: limpo, original, editado: true as const } : { nome: limpo, original, editado: false as const }
  return efetivo ? { ...base, estado: efetivo } : base
}

/** Puro: cadastros chegam por parâmetro (runtime via useCadastros, não seed de build). */
export function criarResolvedor(
  ov: Overrides,
  categorias: CategoriasSeed['categorias'],
  clientes: ClientesSeed['clientes'],
): Resolvedor {
  const porCodigo = new Map(categorias.map((c) => [c.codigo, c]))
  const origemCategoria = (codigo: string): string => {
    if (!codigo || codigo === 'SEM_CATEGORIA') return 'Sem categoria'
    return porCodigo.get(codigo)?.descricao ?? codigo
  }
  // Estado estrutural da categoria: inativa no cadastro → 'inativo'; código que SUMIU do
  // cadastro → 'excluido' (a "exclusão" real da Omie). Cadastro vazio (boot/fallback) não
  // marca nada — senão todo movimento nasceria "excluído" antes do sync chegar.
  const estruturalCategoria = (codigo: string): EstadoRegistro | undefined => {
    if (!codigo || codigo === 'SEM_CATEGORIA' || porCodigo.size === 0) return undefined
    const cad = porCodigo.get(codigo)
    if (!cad) return 'excluido'
    return cad.ativa === false ? 'inativo' : undefined
  }
  const origemContraparte = (codigo: string): string => nomeContraparte(codigo, clientes)
  return {
    categoria: (c) => resolver(origemCategoria(c), ov.categoria[c], estruturalCategoria(c)),
    contraparte: (c) => resolver(origemContraparte(c), ov.contraparte[c]),
    titulo: (id, original) => resolver(original || 'Sem documento', ov.titulo[id]),
  }
}
