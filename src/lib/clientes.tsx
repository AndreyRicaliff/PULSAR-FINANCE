/** @file Contexto do cliente (tenant) ativo: lista, troca e chave de estado por cliente. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ACME, ACME_ID, chaveDoCliente, type Tenant } from '@/core/tenant'
import { supabase } from './supabase'

const CHAVE_ATIVO = 'lumen-cliente-ativo'

interface Patch {
  readonly nome?: string
  readonly documento?: string | null
  readonly ativo?: boolean
}

interface ClientesCtx {
  readonly clientes: readonly Tenant[]
  readonly ativo: Tenant
  readonly carregando: boolean
  readonly selecionar: (id: string) => void
  readonly criar: (nome: string, documento?: string) => Promise<void>
  readonly editar: (id: string, patch: Patch) => Promise<void>
  readonly deletar: (id: string) => Promise<void>
}

const Ctx = createContext<ClientesCtx | null>(null)

function mapear(linha: Record<string, unknown>): Tenant {
  return {
    id: String(linha.id),
    nome: String(linha.nome),
    documento: (linha.documento as string | null) ?? null,
    ativo: Boolean(linha.ativo),
    criadoEm: linha.criado_em ? String(linha.criado_em) : undefined,
  }
}

async function buscar(): Promise<readonly Tenant[]> {
  if (!supabase) return [ACME]
  const { data, error } = await supabase
    .from('painel_clientes')
    .select('*')
    .order('criado_em', { ascending: true })
  if (error || !data?.length) {
    if (error) console.error('[clientes] erro ao listar:', error.message)
    return [ACME]
  }
  return data.map(mapear)
}

export function ClientesProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<readonly Tenant[]>([ACME])
  const [ativoId, setAtivoId] = useState<string>(() => localStorage.getItem(CHAVE_ATIVO) ?? ACME_ID)
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const lista = await buscar()
    setClientes(lista)
    setCarregando(false)
    return lista
  }, [])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  const selecionar = useCallback((id: string) => {
    setAtivoId(id)
    localStorage.setItem(CHAVE_ATIVO, id)
  }, [])

  const criar = useCallback(
    async (nome: string, documento?: string) => {
      if (!supabase) return
      const { error } = await supabase
        .from('painel_clientes')
        .insert({ nome: nome.trim(), documento: documento?.trim() || null })
      if (error) throw new Error(error.message)
      await recarregar()
    },
    [recarregar],
  )

  const editar = useCallback(
    async (id: string, patch: Patch) => {
      if (!supabase) return
      const { error } = await supabase.from('painel_clientes').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
      await recarregar()
    },
    [recarregar],
  )

  const deletar = useCallback(
    async (id: string) => {
      if (!supabase || id === ACME_ID) return // Acme é a âncora dos dados — não removível
      const { error } = await supabase.from('painel_clientes').delete().eq('id', id)
      if (error) throw new Error(error.message)
      const lista = await recarregar()
      if (ativoId === id) selecionar(lista[0]?.id ?? ACME_ID)
    },
    [ativoId, recarregar, selecionar],
  )

  const ativo = useMemo(
    () => clientes.find((c) => c.id === ativoId) ?? clientes[0] ?? ACME,
    [clientes, ativoId],
  )

  const valor = useMemo<ClientesCtx>(
    () => ({ clientes, ativo, carregando, selecionar, criar, editar, deletar }),
    [clientes, ativo, carregando, selecionar, criar, editar, deletar],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useClientes(): ClientesCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useClientes precisa estar dentro de <ClientesProvider>')
  return ctx
}

/** Chave de estado prefixada pelo cliente ativo — isola a camada editada por tenant. */
export function useChaveCliente(base: string): string {
  return chaveDoCliente(useClientes().ativo.id, base)
}
