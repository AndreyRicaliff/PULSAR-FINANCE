/** @file Dispara o sync server-side (edge function) e carrega o histórico de execuções. */
import { useCallback, useEffect, useState } from 'react'
import { normalizarHistorico, type EntradaSync } from '@/core/sync-historico'
import { chaveDoCliente } from '@/core/tenant'
import { useProvedor } from './clientes'
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
  /** Partes acessórias que falharam (ex.: ['cadastros']) — sync concluiu, mas incompleto. */
  readonly parcial?: readonly string[]
  /** Fontes truncadas pelo teto de páginas (dado PARCIAL com cara de completo). */
  readonly truncado?: readonly string[]
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
  const { nome: provedor } = useProvedor()
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
    setEstado((e) => ({ ...e, status: 'rodando', etapa: `Conectando ao ${provedor}…`, msg: undefined }))
    try {
      const { data, error } = await supabase.functions.invoke('sync-omie', {
        body: { clienteId, cliente: nomeCliente },
      })
      if (error) throw error
      if (data && typeof data === 'object' && 'error' in data && data.error) throw new Error(String(data.error))

      // A edge responde na hora e varre em BACKGROUND (tenant grande estourava o teto de
      // execução). Daqui acompanhamos o sync-status até 'ok'/'erro' — só aceitando status
      // gravado DEPOIS do disparo (o doc pode carregar o resultado de uma rodada antiga).
      const disparo = ((await lerDoc(clienteId, 'sync-status')) as { em?: string } | null)?.em ?? ''
      const inicio = Date.now()
      setEstado((e) => ({ ...e, etapa: 'Sincronizando no servidor… (bases grandes levam minutos)' }))
      while (Date.now() - inicio < 15 * 60_000) {
        await new Promise((r) => setTimeout(r, 5000))
        const st = (await lerDoc(clienteId, 'sync-status')) as
          | { estado?: string; em?: string; msg?: string; parcial?: string[]; truncado?: string[] }
          | null
        if (!st?.em || st.em < disparo) continue
        if (st.estado === 'ok') {
          const carga = await carregar() // a função já gravou a entrada — só recarrega
          setEstado({ status: 'ok', etapa: 'Concluído', ...carga, parcial: st.parcial, truncado: st.truncado })
          return
        }
        if (st.estado === 'erro') throw new Error(st.msg ?? 'Falha na sincronização')
      }
      throw new Error('O sync ainda está rodando no servidor — confira o histórico em alguns minutos.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha na sincronização'
      setEstado((prev) => ({ ...prev, status: 'erro', etapa: '', msg: traduzir(msg) }))
    }
  }, [clienteId, nomeCliente, carregar, provedor])

  return { ...estado, sincronizar }
}

function traduzir(msg: string): string {
  // A edge devolve 'Cliente sem credenciais configuradas…' — o filtro antigo exigia a
  // palavra 'Omie' e por isso nunca casava: o usuário via a mensagem crua do servidor.
  if (/sem credenciais/i.test(msg)) return 'Este cliente ainda não tem credenciais de ERP cadastradas — configure antes de sincronizar.'
  if (/Function not found|404|not found/i.test(msg)) return 'A função de sync ainda não foi publicada no Supabase.'
  if (/Failed to fetch|network/i.test(msg)) return 'Sem conexão com o servidor de sync.'
  return msg
}
