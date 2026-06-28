/** @file Cliente Supabase do frontend (anon key via env) — ou mock do snapshot na Apresentação. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { snapshotApresentacao, type SnapshotApresentacao } from './apresentacaoSnapshot'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Modo Apresentação (HTML offline): em vez do Supabase real, um mock que serve o snapshot
 * embutido — o app inteiro roda sem rede, idêntico, lendo os mesmos `painel_estado`/clientes.
 */
function clienteMock(snap: SnapshotApresentacao): SupabaseClient {
  const builder = (tabela: string) => {
    let chave: string | undefined
    let mutacao = false
    const listar = () =>
      tabela === 'painel_clientes' ? { data: snap.clientes, error: null } : { data: [], error: null }
    const um = () => {
      if (tabela !== 'painel_estado' || chave === undefined) return { data: null, error: null }
      const dados = snap.estado[chave]
      return { data: dados === undefined ? null : { dados }, error: null }
    }
    // Mutações (read-only na apresentação) viram no-op {error:null}; leituras devolvem o snapshot.
    const final = () => (mutacao ? { error: null } : listar())
    const muta = () => ((mutacao = true), api)
    const api = {
      select: () => api,
      eq: (_col: string, val: string) => ((chave = val), api),
      order: () => api,
      like: () => api,
      maybeSingle: () => Promise.resolve(um()),
      single: () => Promise.resolve(um()),
      upsert: muta,
      insert: muta,
      update: muta,
      delete: muta,
      then: (ok: (v: unknown) => unknown) => Promise.resolve(final()).then(ok),
    }
    return api
  }
  return {
    from: builder,
    auth: { getSession: async () => ({ data: { session: null } }) },
  } as unknown as SupabaseClient
}

const snap = snapshotApresentacao()

/** Null quando as envs não estão setadas — o app degrada para localStorage puro. */
export const supabase: SupabaseClient | null = snap
  ? clienteMock(snap)
  : url && anon
    ? createClient(url, anon)
    : null
