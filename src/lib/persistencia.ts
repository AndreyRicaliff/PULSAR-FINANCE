/** @file Estado sincronizado por chave: store em memória compartilhado entre componentes
 * (useSyncExternalStore) + localStorage (boot/offline) + Supabase painel_estado (compartilhado).
 * Compartilhar a chave faz toda a UI refletir a edição na hora — sem depender de reload. */
import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'
import { supabase } from './supabase'

const TABELA = 'painel_estado'
const DEBOUNCE_MS = 600

async function buscarRemoto(chave: string): Promise<unknown | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from(TABELA).select('dados').eq('chave', chave).maybeSingle()
  if (error) {
    console.error(`[persistencia] erro ao ler "${chave}":`, error.message)
    return null
  }
  return data?.dados ?? null
}

async function salvarRemoto(chave: string, dados: unknown): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from(TABELA).upsert({ chave, dados })
  if (error) console.error(`[persistencia] erro ao salvar "${chave}":`, error.message)
}

function carregarLocal<T>(chave: string, normalizar: (bruto: unknown) => T): T {
  try {
    const cru = localStorage.getItem(chave)
    return normalizar(cru ? JSON.parse(cru) : null)
  } catch {
    return normalizar(null)
  }
}

interface Store {
  valor: unknown
  readonly listeners: Set<() => void>
  hidratado: boolean
  sujo: boolean
  timer: ReturnType<typeof setTimeout> | null
}

// Um store por chave, compartilhado por todos os componentes que usam a mesma chave.
const stores = new Map<string, Store>()

function emitir(s: Store): void {
  for (const l of s.listeners) l()
}

function obterStore(chave: string, normalizar: (bruto: unknown) => unknown): Store {
  const existente = stores.get(chave)
  if (existente) return existente
  const s: Store = { valor: carregarLocal(chave, normalizar), listeners: new Set(), hidratado: false, sujo: false, timer: null }
  stores.set(chave, s)
  // Hidrata do remoto uma vez. Não sobrescreve se o usuário já editou (evita perder edição rápida).
  void buscarRemoto(chave).then((remoto) => {
    if (remoto != null && !s.sujo) {
      s.valor = normalizar(remoto)
      emitir(s)
    }
    s.hidratado = true
  })
  return s
}

function definirStore(chave: string, atualizar: SetStateAction<unknown>): void {
  const s = stores.get(chave)
  if (!s) return
  s.valor = typeof atualizar === 'function' ? (atualizar as (v: unknown) => unknown)(s.valor) : atualizar
  s.sujo = true
  emitir(s)
  try {
    localStorage.setItem(chave, JSON.stringify(s.valor))
  } catch {
    /* cota/serialização — ignora, o remoto é a fonte */
  }
  if (s.timer) clearTimeout(s.timer)
  s.timer = setTimeout(() => void salvarRemoto(chave, s.valor), DEBOUNCE_MS)
}

/**
 * Estado sincronizado por chave, COMPARTILHADO entre componentes da mesma chave (atualiza
 * todas as telas na hora) + localStorage + Supabase (debounced). `normalizar(null)` deve
 * devolver o padrão. Persiste só após o store existir; não sobrescreve edição com cache obsoleto.
 */
export function useEstadoSincronizado<T>(
  chave: string,
  normalizar: (bruto: unknown) => T,
): readonly [T, Dispatch<SetStateAction<T>>] {
  const store = obterStore(chave, normalizar as (bruto: unknown) => unknown)
  const subscrever = useCallback(
    (cb: () => void) => {
      store.listeners.add(cb)
      return () => store.listeners.delete(cb)
    },
    [store],
  )
  const valor = useSyncExternalStore(subscrever, () => store.valor as T)
  const definir = useCallback<Dispatch<SetStateAction<T>>>((a) => definirStore(chave, a as SetStateAction<unknown>), [chave])
  return [valor, definir] as const
}
