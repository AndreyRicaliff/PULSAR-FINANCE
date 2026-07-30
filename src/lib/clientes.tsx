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
import { rotulosProvedor, type Provedor, type RotulosProvedor } from '@/core/provedor'
import { ACME, ACME_ID, chaveDoCliente, type Tenant } from '@/core/tenant'
import { Carregando } from '@/components/Login'
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
    provedor: (linha.provedor as Provedor | null) ?? null,
    criadoEm: linha.criado_em ? String(linha.criado_em) : undefined,
  }
}

async function buscar(): Promise<readonly Tenant[]> {
  if (!supabase) return [ACME]
  const { data, error } = await supabase
    .from('painel_clientes')
    .select('*')
    .order('nome', { ascending: true })
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

  // `finally` é obrigatório: o render está travado em <Carregando/> até `carregando` cair,
  // então uma exceção aqui (rede fora) deixaria o app preso no spinner para sempre.
  const recarregar = useCallback(async () => {
    try {
      const lista = await buscar()
      setClientes(lista)
      return lista
    } finally {
      setCarregando(false)
    }
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

  // Enquanto a lista não chega, `ativo` é o tenant de fallback — um id que não existe em
  // produção. Montar a árvore nessa janela faz as chaves de estado (`cliente:<id>:<base>`)
  // nascerem apontando para um cliente fantasma. Segurar o render fecha a janela na origem.
  if (carregando) return <Carregando />

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useClientes(): ClientesCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useClientes precisa estar dentro de <ClientesProvider>')
  return ctx
}

/**
 * Rótulos do ERP do cliente ativo. Toda menção ao provedor na UI passa por aqui — texto
 * fixo "Omie" mente para os tenants Nibo (bug visto em prod na DR PIZZA, 2026-07-22).
 */
export function useProvedor(): RotulosProvedor {
  return rotulosProvedor(useClientes().ativo.provedor)
}

/** Chave de estado prefixada pelo cliente ativo — isola a camada editada por tenant. */
export function useChaveCliente(base: string): string {
  return chaveDoCliente(useClientes().ativo.id, base)
}
