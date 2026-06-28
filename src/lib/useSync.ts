/** @file Dispara o sync server-side (edge function) e carrega o histórico de execuções. */
import { useCallback, useEffect, useState } from 'react'
import { normalizarHistorico, type EntradaSync } from '@/core/sync-historico'
import { chaveDoCliente } from '@/core/tenant'
import { supabase } from './supabase'

export interface ResumoSync {
  readonly em: string
  readonly novos: number
  readonly atualizados: number
  readonly removidos?: number
}

interface Estado {
  readonly status: 'idle' | 'rodando' | 'ok' | 'erro'
  readonly etapa: string
  readonly msg?: string
  readonly ultimo?: ResumoSync
  readonly historico: readonly EntradaSync[]
}

const META = 'sync-meta' // legado: só leitura, até a 1ª sync gravar histórico
const HISTORICO = 'sync-historico'

async function lerDoc(clienteId: string, base: string): Promise<unknown> {
  if (!supabase) return null
  const { data } = await supabase
    .from('painel_estado')
    .select('dados')
    .eq('chave', chaveDoCliente(clienteId, base))
    .maybeSingle()
  return data?.dados ?? null
}

function ultimoDe(historico: readonly EntradaSync[], legado: unknown): ResumoSync | undefined {
  const topo = historico[0]
  if (topo) {
    return { em: topo.em, novos: topo.contagens.novos, atualizados: topo.contagens.atualizados, removidos: topo.contagens.removidos }
  }
  return legadoValido(legado)
}

function legadoValido(v: unknown): ResumoSync | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const r = v as Record<string, unknown>
  if (typeof r.em !== 'string') return undefined
  return { em: r.em, novos: Number(r.novos) || 0, atualizados: Number(r.atualizados) || 0 }
}

export interface SyncApi extends Estado {
  readonly sincronizar: () => Promise<void>
}

/** Dispara o sync server-side (Edge Function sync-omie) e expõe o histórico de execuções. */
export function useSync(clienteId: string, nomeCliente: string): SyncApi {
  const [estado, setEstado] = useState<Estado>({ status: 'idle', etapa: '', historico: [] })

  const carregar = useCallback(async (): Promise<Pick<Estado, 'historico' | 'ultimo'>> => {
    const [docHist, legado] = await Promise.all([lerDoc(clienteId, HISTORICO), lerDoc(clienteId, META)])
    const historico = normalizarHistorico(docHist)
    return { historico, ultimo: ultimoDe(historico, legado) }
  }, [clienteId])

  useEffect(() => {
    let vivo = true
    setEstado({ status: 'idle', etapa: '', historico: [] })
    void carregar().then((carga) => {
      if (vivo) setEstado((e) => ({ ...e, ...carga }))
    })
    return () => {
      vivo = false
    }
  }, [carregar])

  const sincronizar = useCallback(async () => {
    if (!supabase) {
      setEstado((e) => ({ ...e, status: 'erro', msg: 'Supabase não configurado.' }))
      return
    }
    setEstado((e) => ({ ...e, status: 'rodando', etapa: 'Conectando à Omie…', msg: undefined }))
    try {
      const { data, error } = await supabase.functions.invoke('sync-omie', {
        body: { clienteId, cliente: nomeCliente },
      })
      if (error) throw error
      if (data && typeof data === 'object' && 'error' in data && data.error) throw new Error(String(data.error))
      const carga = await carregar() // a função já gravou a entrada — só recarrega
      setEstado({ status: 'ok', etapa: 'Concluído', ...carga })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha na sincronização'
      setEstado((prev) => ({ ...prev, status: 'erro', etapa: '', msg: traduzir(msg) }))
    }
  }, [clienteId, nomeCliente, carregar])

  return { ...estado, sincronizar }
}

function traduzir(msg: string): string {
  if (/sem credenciais Omie/i.test(msg)) return 'Este cliente ainda não tem credenciais Omie cadastradas — configure antes de sincronizar.'
  if (/Function not found|404|not found/i.test(msg)) return 'A função de sync ainda não foi publicada no Supabase.'
  if (/Failed to fetch|network/i.test(msg)) return 'Sem conexão com o servidor de sync.'
  return msg
}
