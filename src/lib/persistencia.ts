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

// ── Estado global de sincronização ──────────────────────────────────────────────
// A UI é otimista (a edição aparece na hora); sem este estado, um upsert recusado
// morria em console.error e o financeiro conciliava o mês acreditando que salvou —
// perda silenciosa de trabalho contábil (achado 🟠 da revisão de 2026-07-29, e
// pendência declarada desde 24/07). O selo na Topbar lê daqui.
export interface EstadoSync {
  readonly estado: 'ocioso' | 'salvando' | 'salvo' | 'erro'
  /** Chaves cuja última gravação remota FALHOU (localStorage ainda tem o valor). */
  readonly falhas: number
  readonly ultimoSalvoEm: string | null
}

const sync = {
  pendentes: new Set<string>(),
  falhas: new Set<string>(),
  ultimoSalvoEm: null as string | null,
  listeners: new Set<() => void>(),
  foto: { estado: 'ocioso', falhas: 0, ultimoSalvoEm: null } as EstadoSync,
}

function atualizarSync(): void {
  sync.foto = {
    estado: sync.pendentes.size
      ? 'salvando'
      : sync.falhas.size
        ? 'erro'
        : sync.ultimoSalvoEm
          ? 'salvo'
          : 'ocioso',
    falhas: sync.falhas.size,
    ultimoSalvoEm: sync.ultimoSalvoEm,
  }
  for (const l of sync.listeners) l()
}

/** Estado da gravação remota, para o selo da Topbar. */
export function useEstadoSync(): EstadoSync {
  const subscrever = useCallback((cb: () => void) => {
    sync.listeners.add(cb)
    return () => sync.listeners.delete(cb)
  }, [])
  return useSyncExternalStore(subscrever, () => sync.foto)
}

/** Re-tenta as chaves que falharam (o valor vivo continua no store/localStorage). */
export function tentarSalvarDeNovo(): void {
  for (const chave of [...sync.falhas]) {
    const s = stores.get(chave)
    if (!s) continue
    sync.pendentes.add(chave)
    void salvarRemoto(chave, s.valor)
  }
  atualizarSync()
}

// ── Marcador de "local é mais novo que o remoto" ────────────────────────────────
// Sobrevive ao reload, e é o que impede o remoto VELHO de apagar a edição local NOVA na
// hidratação. Só é marcado quando a cópia local foi realmente gravada: com o localStorage
// na cota (tenant grande — movimentos-raw passa de 16 MB em prod), o setItem falha e a
// cópia local fica DEFASADA; marcar ali faria o boot reenviar lixo por cima do bom.
const CHAVE_PENDENTES = 'painel-estado-pendentes'

function pendentesLocais(): Set<string> {
  try {
    const cru: unknown = JSON.parse(localStorage.getItem(CHAVE_PENDENTES) ?? '[]')
    return new Set(Array.isArray(cru) ? (cru as string[]) : [])
  } catch {
    return new Set()
  }
}

function marcarPendente(chave: string, pendente: boolean): void {
  try {
    const s = pendentesLocais()
    if (pendente) s.add(chave)
    else s.delete(chave)
    localStorage.setItem(CHAVE_PENDENTES, JSON.stringify([...s]))
  } catch {
    /* cota — o pior caso volta a ser o comportamento antigo, não um pior */
  }
}

async function salvarRemoto(chave: string, dados: unknown): Promise<void> {
  if (!supabase) return
  // Idempotente: garante o "salvando…" também quando chamado pelo timer/retry.
  sync.pendentes.add(chave)
  atualizarSync()
  const { error } = await supabase.from(TABELA).upsert({ chave, dados })
  sync.pendentes.delete(chave)
  if (error) {
    console.error(`[persistencia] erro ao salvar "${chave}":`, error.message)
    sync.falhas.add(chave)
  } else {
    sync.falhas.delete(chave)
    marcarPendente(chave, false)
    if (sync.pendentes.size === 0) sync.ultimoSalvoEm = new Date().toISOString()
  }
  atualizarSync()
}

/**
 * Descarrega os debounces pendentes agora. O timer de 600ms morre com a aba: fechar, dar F5
 * ou trocar de app logo depois de digitar perdia a última alteração. 'visibilitychange' é o
 * gancho que ainda dá tempo de a requisição sair; 'pagehide' é a última chance.
 */
function descarregarPendentes(): void {
  for (const [chave, s] of stores) {
    if (!s.timer) continue
    clearTimeout(s.timer)
    s.timer = null
    void salvarRemoto(chave, s.valor)
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') descarregarPendentes()
  })
  window.addEventListener('pagehide', descarregarPendentes)
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
  // A sessão anterior editou e a gravação remota nunca confirmou: a cópia local é a NOVA.
  const localMaisNovo = pendentesLocais().has(chave)
  // Hidrata do remoto uma vez. Não sobrescreve se o usuário já editou (evita perder edição rápida).
  void buscarRemoto(chave).then((remoto) => {
    if (remoto != null && !s.sujo && !localMaisNovo) {
      s.valor = normalizar(remoto)
      emitir(s)
    }
    s.hidratado = true
    // Sem isto o remoto VELHO apagava a edição local NOVA em silêncio — e o localStorage,
    // única cópia sobrevivente, era descartado sem ninguém ver. Reenvia em vez de descartar.
    if (localMaisNovo && !s.sujo) void salvarRemoto(chave, s.valor)
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
    // Só marca quando a cópia local existe DE FATO — ver CHAVE_PENDENTES.
    marcarPendente(chave, true)
  } catch {
    /* cota/serialização — ignora, o remoto é a fonte */
  }
  if (s.timer) clearTimeout(s.timer)
  sync.pendentes.add(chave)
  atualizarSync()
  // Zerar o timer ao disparar não é cosmético: `descarregarPendentes` usa ele como "há algo
  // por gravar", e sem isso toda troca de aba reenviava gravações já concluídas.
  s.timer = setTimeout(() => {
    s.timer = null
    void salvarRemoto(chave, s.valor)
  }, DEBOUNCE_MS)
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
