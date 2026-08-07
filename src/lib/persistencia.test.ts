// @vitest-environment jsdom
/**
 * @file A regra que estes testes protegem é uma só: NUNCA descartar a cópia local quando ela
 * é a mais nova. Até 07/08 a hidratação sobrescrevia o localStorage com o remoto sempre que
 * `!s.sujo` — e `sujo` nasce false a cada reload. Quem digitasse e fechasse a aba dentro dos
 * 600ms de debounce (ou tivesse o upsert recusado) perdia a alteração no boot seguinte, sem
 * erro na tela. O caso da cota está aqui porque o fix ingênuo INVERTE o bug em tenant grande.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const backend = vi.hoisted(() => ({
  remoto: null as unknown,
  upserts: [] as { chave: string; dados: unknown }[],
  erro: null as { message: string } | null,
}))

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: backend.remoto === null ? null : { dados: backend.remoto }, error: null }),
        }),
      }),
      upsert: (linha: { chave: string; dados: unknown }) => {
        backend.upserts.push(linha)
        return Promise.resolve({ error: backend.erro })
      },
    }),
  },
}))

/**
 * Chave EXCLUSIVA por teste. `vi.resetModules()` cria uma instância nova do módulo, mas os
 * listeners de visibilitychange das instâncias anteriores continuam no mesmo `document` do
 * jsdom — sem chaves distintas, um teste descarregaria os stores do outro e a contagem de
 * upserts mediria ruído. (Em produção o módulo carrega uma vez só; isto é do ambiente.)
 */
let CHAVE = ''
let seq = 0
const PENDENTES = 'painel-estado-pendentes'
const normalizar = (b: unknown): { texto: string } => (b ?? { texto: '' }) as { texto: string }

/** Módulo novo a cada teste: `stores` é global e guardaria o estado do teste anterior. */
async function modulo() {
  vi.resetModules()
  return import('./persistencia')
}

beforeEach(() => {
  localStorage.clear()
  backend.remoto = null
  backend.upserts = []
  backend.erro = null
  CHAVE = `cliente:t1:doc-${++seq}`
})

/** Só o que ESTE teste gravou — o resto é eco das instâncias anteriores do módulo. */
const meusUpserts = () => backend.upserts.filter((u) => u.chave === CHAVE)
afterEach(() => vi.restoreAllMocks())

describe('hidratação', () => {
  it('sem pendência, o remoto manda — comportamento normal preservado', async () => {
    localStorage.setItem(CHAVE, JSON.stringify({ texto: 'local antigo' }))
    backend.remoto = { texto: 'remoto' }
    const { useEstadoSincronizado } = await modulo()
    const { result } = renderHook(() => useEstadoSincronizado(CHAVE, normalizar))
    await waitFor(() => expect(result.current[0].texto).toBe('remoto'))
  })

  it('🔴 com gravação local não confirmada, o remoto VELHO não apaga a edição nova', async () => {
    localStorage.setItem(CHAVE, JSON.stringify({ texto: 'fechamento de julho' }))
    localStorage.setItem(PENDENTES, JSON.stringify([CHAVE]))
    backend.remoto = { texto: 'versao velha do servidor' }
    const { useEstadoSincronizado } = await modulo()
    const { result } = renderHook(() => useEstadoSincronizado(CHAVE, normalizar))
    // Reenvia em vez de descartar: a sessão anterior morreu antes do debounce sair.
    await waitFor(() => expect(meusUpserts()).toHaveLength(1))
    expect(meusUpserts()[0]!.dados).toEqual({ texto: 'fechamento de julho' })
    expect(result.current[0].texto).toBe('fechamento de julho')
  })

  it('a pendência é de UMA chave — não congela as outras no valor local', async () => {
    localStorage.setItem(PENDENTES, JSON.stringify(['cliente:t1:outra-coisa']))
    localStorage.setItem(CHAVE, JSON.stringify({ texto: 'local' }))
    backend.remoto = { texto: 'remoto' }
    const { useEstadoSincronizado } = await modulo()
    const { result } = renderHook(() => useEstadoSincronizado(CHAVE, normalizar))
    await waitFor(() => expect(result.current[0].texto).toBe('remoto'))
  })
})

describe('marcador de pendência', () => {
  it('editar marca; gravação remota bem-sucedida desmarca', async () => {
    vi.useFakeTimers()
    try {
      const { useEstadoSincronizado } = await modulo()
      const { result } = renderHook(() => useEstadoSincronizado(CHAVE, normalizar))
      result.current[1]({ texto: 'novo' })
      expect(JSON.parse(localStorage.getItem(PENDENTES)!)).toContain(CHAVE)
      await vi.advanceTimersByTimeAsync(700)
      expect(JSON.parse(localStorage.getItem(PENDENTES)!)).not.toContain(CHAVE)
    } finally {
      vi.useRealTimers()
    }
  })

  it('upsert recusado MANTÉM a marca — é exatamente o caso que o boot precisa saber', async () => {
    vi.useFakeTimers()
    try {
      backend.erro = { message: 'new row violates row-level security policy' }
      const { useEstadoSincronizado } = await modulo()
      const { result } = renderHook(() => useEstadoSincronizado(CHAVE, normalizar))
      result.current[1]({ texto: 'nao vai subir' })
      await vi.advanceTimersByTimeAsync(700)
      expect(JSON.parse(localStorage.getItem(PENDENTES)!)).toContain(CHAVE)
    } finally {
      vi.useRealTimers()
    }
  })

  it('🔴 cota estourada NÃO marca pendência — senão o boot reenviaria a cópia local defasada', async () => {
    // Tenant grande: movimentos-raw passa de 16 MB em prod e enche o localStorage. Sem este
    // cuidado, o fix da hidratação viraria um bug pior — local velho sobrescrevendo remoto bom.
    const real = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === CHAVE) throw new DOMException('QuotaExceededError')
      real.call(this, k, v)
    })
    const { useEstadoSincronizado } = await modulo()
    const { result } = renderHook(() => useEstadoSincronizado(CHAVE, normalizar))
    result.current[1]({ texto: 'grande demais' })
    expect(localStorage.getItem(PENDENTES)).toBeNull()
  })
})

describe('descarga do debounce', () => {
  it('esconder a aba grava agora — o timer de 600ms morre junto com ela', async () => {
    vi.useFakeTimers()
    try {
      const { useEstadoSincronizado } = await modulo()
      const { result } = renderHook(() => useEstadoSincronizado(CHAVE, normalizar))
      result.current[1]({ texto: 'ultima frase digitada' })
      expect(meusUpserts()).toHaveLength(0) // ainda dentro do debounce
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
      expect(meusUpserts()).toHaveLength(1)
      expect(meusUpserts()[0]!.dados).toEqual({ texto: 'ultima frase digitada' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('sem nada pendente, esconder a aba não gera tráfego', async () => {
    const { useEstadoSincronizado } = await modulo()
    renderHook(() => useEstadoSincronizado(CHAVE, normalizar))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(meusUpserts()).toHaveLength(0)
  })
})
