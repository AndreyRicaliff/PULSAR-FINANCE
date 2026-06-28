/**
 * @file Títulos (contas a pagar/receber) em RUNTIME: doc do sync (titulos-raw) com o seed
 * bundlado como fallback de boot — mesmo padrão de movimentos/cadastros, seed só da Acme.
 */
import { useCallback, useEffect, useState } from 'react'
import { ACME_ID, chaveDoCliente } from '@/core/tenant'
import type { Titulo, TitulosSeed } from '@/core/titulo'
import { titulosSeed } from '@/data/titulos'
import { useClientes } from './clientes'
import { supabase } from './supabase'

const BASE = 'titulos-raw'

export interface TitulosApi {
  readonly titulos: readonly Titulo[]
  readonly geradoEm: string | null
  readonly origem: 'local' | 'sync'
}

function fallbackLocal(clienteId: string): TitulosApi {
  if (clienteId === ACME_ID) return { titulos: titulosSeed.titulos, geradoEm: titulosSeed.geradoEm, origem: 'local' }
  return { titulos: [], geradoEm: null, origem: 'local' }
}

// Boundary: doc gravado pela edge function sync-omie.
function docValido(v: unknown): v is TitulosSeed {
  if (typeof v !== 'object' || v === null) return false
  return Array.isArray((v as Record<string, unknown>).titulos)
}

export function useTitulos(): TitulosApi {
  const { ativo } = useClientes()
  const [estado, setEstado] = useState<TitulosApi>(() => fallbackLocal(ativo.id))

  const carregar = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('painel_estado')
      .select('dados')
      .eq('chave', chaveDoCliente(ativo.id, BASE))
      .maybeSingle()
    if (error) {
      console.error('[titulos] erro ao ler doc do sync:', error.message)
      return
    }
    const doc = data?.dados
    if (docValido(doc) && doc.titulos.length > 0) {
      setEstado({ titulos: doc.titulos, geradoEm: doc.geradoEm ?? null, origem: 'sync' })
    }
  }, [ativo.id])

  useEffect(() => {
    setEstado(fallbackLocal(ativo.id))
    void carregar()
  }, [ativo.id, carregar])

  return estado
}
