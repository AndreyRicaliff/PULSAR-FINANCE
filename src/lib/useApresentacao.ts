/** @file Estado editável da Apresentação por cliente: capa + roteiro ordenado (slides de seção e livres). */
import { useCallback } from 'react'
import {
  ROTEIRO_PADRAO,
  type CapaConfig,
  type EstadoApresentacao,
  type SecaoSlideId,
  type SlideItem,
} from '@/components/apresentacao/tipos'
import { useChaveCliente } from './clientes'
import { useEstadoSincronizado } from './persistencia'

const BASE = 'apresentacao-v2'

function normalizar(bruto: unknown): EstadoApresentacao {
  const e = (bruto ?? {}) as Partial<EstadoApresentacao>
  return {
    capa: { titulo: '', subtitulo: '', elaboradoPor: 'AG Consultoria', ...e.capa },
    roteiro: e.roteiro?.length ? e.roteiro : ROTEIRO_PADRAO,
    periodo: { de: e.periodo?.de ?? null, ate: e.periodo?.ate ?? null },
  }
}

export interface ApresentacaoApi {
  readonly estado: EstadoApresentacao
  readonly definirCapa: (patch: Partial<CapaConfig>) => void
  readonly definirPeriodo: (faixa: { de: string | null; ate: string | null }) => void
  /** Atualiza campos do slide na posição `i` (argumento/observacao/titulo conforme o tipo). */
  readonly patchItem: (i: number, patch: Partial<SlideItem>) => void
  readonly mover: (i: number, novoIndice: number) => void
  readonly remover: (i: number) => void
  readonly adicionarSecao: (secao: SecaoSlideId) => void
  readonly adicionarLivre: () => void
}

export function useApresentacao(): ApresentacaoApi {
  const chave = useChaveCliente(BASE)
  const [estado, setEstado] = useEstadoSincronizado<EstadoApresentacao>(chave, normalizar)

  const setRoteiro = useCallback(
    (fn: (r: readonly SlideItem[]) => SlideItem[]) => setEstado((e) => ({ ...e, roteiro: fn(e.roteiro) })),
    [setEstado],
  )

  const definirCapa = useCallback((patch: Partial<CapaConfig>) => setEstado((e) => ({ ...e, capa: { ...e.capa, ...patch } })), [setEstado])
  const definirPeriodo = useCallback((faixa: { de: string | null; ate: string | null }) => setEstado((e) => ({ ...e, periodo: faixa })), [setEstado])

  const patchItem = useCallback(
    (i: number, patch: Partial<SlideItem>) => setRoteiro((r) => r.map((it, j) => (j === i ? ({ ...it, ...patch } as SlideItem) : it))),
    [setRoteiro],
  )

  const mover = useCallback(
    (i: number, novoIndice: number) =>
      setRoteiro((r) => {
        const item = r[i]
        if (!item) return [...r]
        const resto = r.filter((_, j) => j !== i)
        const k = Math.max(0, Math.min(novoIndice, resto.length))
        return [...resto.slice(0, k), item, ...resto.slice(k)]
      }),
    [setRoteiro],
  )

  const remover = useCallback((i: number) => setRoteiro((r) => r.filter((_, j) => j !== i)), [setRoteiro])
  const adicionarSecao = useCallback(
    (secao: SecaoSlideId) => setRoteiro((r) => [...r, { tipo: 'secao', secao, argumento: '', observacao: '' }]),
    [setRoteiro],
  )
  const adicionarLivre = useCallback(
    () => setRoteiro((r) => [...r, { tipo: 'livre', id: crypto.randomUUID(), titulo: '', argumento: '' }]),
    [setRoteiro],
  )

  return { estado, definirCapa, definirPeriodo, patchItem, mover, remover, adicionarSecao, adicionarLivre }
}
