/**
 * @file Fonte única de movimentos em RUNTIME: doc gravado pelo sync (painel_estado,
 * chave cliente:<id>:movimentos-raw) com o seed bundlado como fallback de boot.
 * O seed é a foto da Acme no build — outro tenant nunca herda esse fallback.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Movimento, MovimentosSeed } from '@/core/movimento'
import { aplicarPisoDados } from '@/core/periodo'
import { chaveDoCliente, pisoDadosDoCliente } from '@/core/tenant'
import { useClientes } from './clientes'
import { supabase } from './supabase'

const BASE = 'movimentos-raw'

export interface FonteMovimentos {
  readonly movimentos: readonly Movimento[]
  readonly geradoEm: string | null
  /** 'local' = seed do build; 'sync' = doc vivo do painel_estado. */
  readonly origem: 'local' | 'sync'
  readonly recarregar: () => Promise<void>
}

const Ctx = createContext<FonteMovimentos | null>(null)

// Boundary: doc gravado pela edge function sync-omie ({ movimentos, geradoEm }).
function docValido(v: unknown): v is MovimentosSeed {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return Array.isArray(r.movimentos) && r.movimentos.length > 0
}

// Sem seed: cada tenant parte vazio e hidrata só do PRÓPRIO sync (painel_estado por cliente).
// O seed era a conta da Acme/27 e contaminava a ACME 36 — dado real vem só do sync do cliente.
function fallbackLocal(): Pick<FonteMovimentos, 'movimentos' | 'geradoEm' | 'origem'> {
  return { movimentos: [], geradoEm: null, origem: 'local' }
}

export function MovimentosProvider({ children }: { children: ReactNode }) {
  const { ativo } = useClientes()
  const [estado, setEstado] = useState(() => fallbackLocal())

  const recarregar = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('painel_estado')
      .select('dados')
      .eq('chave', chaveDoCliente(ativo.id, BASE))
      .maybeSingle()
    if (error) {
      console.error('[movimentos] erro ao ler doc do sync:', error.message)
      return
    }
    const doc = data?.dados
    if (docValido(doc)) {
      const piso = pisoDadosDoCliente(ativo.id)
      setEstado({
        movimentos: aplicarPisoDados(doc.movimentos, piso),
        geradoEm: doc.geradoEm ?? null,
        origem: 'sync',
      })
    }
  }, [ativo.id])

  // Troca de tenant → volta ao fallback do novo tenant antes de hidratar (não vaza dado entre clientes).
  useEffect(() => {
    setEstado(fallbackLocal())
    void recarregar()
  }, [ativo.id, recarregar])

  const valor = useMemo(() => ({ ...estado, recarregar }), [estado, recarregar])
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useMovimentos(): FonteMovimentos {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMovimentos fora de MovimentosProvider')
  return ctx
}
