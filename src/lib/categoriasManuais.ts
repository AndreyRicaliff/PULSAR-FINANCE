/**
 * @file Doc por tenant das categorias criadas manualmente no painel (padrão editável do
 * painel_estado — mesma RLS por prefixo; o sync nunca toca esta chave).
 */
import { useCallback, useMemo } from 'react'
import type { Categoria, Natureza } from '@/core/categoria'
import {
  criarCategoriaManual,
  normalizarCategoriasManuais,
  type DocCategoriasManuais,
} from '@/core/categoriaManual'
import { useChaveCliente } from './clientes'
import { useEstadoSincronizado } from './persistencia'

const BASE_CHAVE = 'categorias-manuais-v1'

export function useCategoriasManuais() {
  const chave = useChaveCliente(BASE_CHAVE)
  const [doc, setDoc] = useEstadoSincronizado<DocCategoriasManuais>(chave, normalizarCategoriasManuais)
  // setDoc nas deps (não []): setter é ligado à chave do tenant ativo — congelar gravaria
  // no cliente fantasma do boot (bug real dos overrides, 2026-07-21).
  const criar = useCallback(
    (descricao: string, natureza: Natureza, existentes: readonly Categoria[]): { codigo: string } | { erro: string } => {
      const r = criarCategoriaManual(doc, descricao, natureza, existentes, crypto.randomUUID())
      if ('erro' in r) return r
      setDoc(r.doc)
      return { codigo: r.codigo }
    },
    [doc, setDoc],
  )
  const manuais = useMemo(() => doc.categorias, [doc])
  return { manuais, criar }
}
