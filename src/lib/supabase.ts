/** @file Cliente Supabase do frontend (anon key via env) — ou mock do snapshot na Apresentação. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { snapshotApresentacao, type SnapshotApresentacao } from './apresentacaoSnapshot'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

const INDISPONIVEL = { message: 'indisponível na apresentação offline' }

/**
 * Modo Apresentação (HTML offline): em vez do Supabase real, um mock que serve o snapshot
 * embutido — o app inteiro roda sem rede, idêntico, lendo os mesmos `painel_estado`/clientes.
 *
 * O builder é um Proxy CHAINABLE-POR-PADRÃO: método desconhecido devolve o próprio builder.
 * Antes ele enumerava métodos, e cada API nova usada no boot (onAuthStateChange do 2FA,
 * .is() dos lançamentos manuais) virava TypeError → HTML exportado abria em BRANCO
 * (report 2026-08-05: "não gera HTML de apresentação"). Exportado para teste de regressão.
 */
export function clienteMock(snap: SnapshotApresentacao): SupabaseClient {
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
    const explicito: Record<string, unknown> = {
      eq: (col: string, val: string) => {
        if (col === 'chave') chave = val
        return proxy
      },
      maybeSingle: () => Promise.resolve(um()),
      single: () => Promise.resolve(um()),
      upsert: () => ((mutacao = true), proxy),
      insert: () => ((mutacao = true), proxy),
      update: () => ((mutacao = true), proxy),
      delete: () => ((mutacao = true), proxy),
      then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
        Promise.resolve(final()).then(ok, err),
    }
    const proxy: Record<string, unknown> = new Proxy(explicito, {
      get(alvo, prop) {
        if (typeof prop === 'symbol') return undefined
        if (prop in alvo) return alvo[prop]
        return () => proxy
      },
    })
    return proxy
  }
  return {
    from: builder,
    auth: {
      getSession: async () => ({ data: { session: null } }),
      // Assinatura inerte: use2FA/useAuth assinam no boot mesmo em modo apresentação.
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
    rpc: async () => ({ data: null, error: INDISPONIVEL }),
    functions: { invoke: async () => ({ data: null, error: INDISPONIVEL }) },
  } as unknown as SupabaseClient
}

const snap = snapshotApresentacao()

/** Null quando as envs não estão setadas — o app degrada para localStorage puro. */
export const supabase: SupabaseClient | null = snap
  ? clienteMock(snap)
  : url && anon
    ? createClient(url, anon)
    : null
