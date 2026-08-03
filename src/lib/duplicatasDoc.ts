/**
 * @file Doc por tenant dos grupos de duplicata marcados como legítimos ("não é duplicata").
 * Segue o padrão editável do painel_estado (mesma RLS por prefixo — operador grava,
 * cliente só lê): chave `cliente:<id>:duplicatas-v1`.
 */
import { useCallback, useMemo } from 'react'
import { normalizarDuplicatas, type DocDuplicatas } from '@/core/duplicatas'
import { useChaveCliente } from './clientes'
import { useEstadoSincronizado } from './persistencia'

const BASE_CHAVE = 'duplicatas-v1'

export function useDuplicatasIgnoradas() {
  const chave = useChaveCliente(BASE_CHAVE)
  const [doc, setDoc] = useEstadoSincronizado<DocDuplicatas>(chave, normalizarDuplicatas)
  // setDoc nas deps (não []): o setter é ligado à chave do tenant ativo — congelá-lo
  // gravaria no cliente fantasma do boot (bug real dos overrides, 2026-07-21).
  const ignorar = useCallback(
    (chaveGrupo: string) =>
      setDoc((d) => (d.ignoradas.includes(chaveGrupo) ? d : { ignoradas: [...d.ignoradas, chaveGrupo] })),
    [setDoc],
  )
  const ignoradas = useMemo(() => new Set(doc.ignoradas), [doc])
  return { ignoradas, ignorar }
}
