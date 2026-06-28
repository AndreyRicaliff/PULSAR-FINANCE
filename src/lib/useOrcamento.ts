/**
 * @file Orçamento de caixa da Omie (previsto × realizado POR BAIXA, por categoria/mês),
 * lido do doc `cliente:<id>:orcamento-raw` em painel_estado. Sem seed: vazio até o
 * backfill/sync popular. O realizado daqui é auditável 1:1 contra a Omie (granularidade
 * de baixa), diferente do espelho de títulos (ver docs/DISCOVERY_PREVISTO_REALIZADO.md).
 */
import { useCallback, useEffect, useState } from 'react'
import { chaveDoCliente } from '@/core/tenant'
import { useClientes } from './clientes'
import { supabase } from './supabase'

const BASE = 'orcamento-raw'

export interface LinhaOrcamento {
  readonly categoria: string
  readonly previstoCentavos: number
  readonly realizadoCentavos: number
}

export interface OrcamentoDoc {
  /** 'aaaa-mm' → folhas com valor no mês. */
  readonly meses: Readonly<Record<string, readonly LinhaOrcamento[]>>
  readonly geradoEm: string | null
}

const VAZIO: OrcamentoDoc = { meses: {}, geradoEm: null }

// Boundary: doc gravado pelo backfill/sync.
function docValido(v: unknown): v is OrcamentoDoc {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return typeof r.meses === 'object' && r.meses !== null
}

export function useOrcamento(): OrcamentoDoc {
  const { ativo } = useClientes()
  const [doc, setDoc] = useState<OrcamentoDoc>(VAZIO)

  const carregar = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('painel_estado')
      .select('dados')
      .eq('chave', chaveDoCliente(ativo.id, BASE))
      .maybeSingle()
    if (error) {
      console.error('[orcamento] erro ao ler doc:', error.message)
      return
    }
    if (docValido(data?.dados)) setDoc(data.dados)
  }, [ativo.id])

  useEffect(() => {
    setDoc(VAZIO)
    void carregar()
  }, [ativo.id, carregar])

  return doc
}
