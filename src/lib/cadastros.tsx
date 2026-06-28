/**
 * @file Cadastros Omie (categorias, clientes, departamentos) em RUNTIME: doc gravado pelo
 * sync (painel_estado, chave cliente:<id>:cadastros-raw) com os seeds bundlados como
 * fallback de boot. Mesmo padrão de src/lib/movimentos.tsx — seeds são a foto da Acme.
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
import type { CategoriasSeed } from '@/core/categoria'
import { montarEstruturaCentros, type Departamento } from '@/core/centros'
import type { ClientesSeed } from '@/core/cliente'
import type { No } from '@/core/modelo'
import { ACME_ID, chaveDoCliente } from '@/core/tenant'
import { seed as categoriasSeed } from '@/data/categorias'
import { clientesSeed } from '@/data/clientes'
import { departamentosSeed } from '@/data/departamentos'
import { useClientes } from './clientes'
import { supabase } from './supabase'

const BASE = 'cadastros-raw'

interface DocCadastros {
  readonly categorias: CategoriasSeed['categorias']
  readonly relatorio: CategoriasSeed['relatorio']
  readonly clientes: ClientesSeed['clientes']
  readonly departamentos: readonly Departamento[]
  readonly geradoEm: string
}

export interface CadastrosApi {
  readonly categorias: CategoriasSeed
  readonly clientes: ClientesSeed
  /** código → nome, pronto para o casamento contraparte↔filial. */
  readonly nomesContrapartes: ReadonlyMap<string, string>
  readonly departamentos: readonly Departamento[]
  readonly estruturaCentros: readonly No[]
  readonly origem: 'local' | 'sync'
  readonly recarregar: () => Promise<void>
}

const Ctx = createContext<CadastrosApi | null>(null)

const RELATORIO_VAZIO: CategoriasSeed['relatorio'] = {
  total: 0,
  porNatureza: { receita: 0, despesa: 0, transferencia: 0, outra: 0 },
  agrupadoras: 0,
  analiticas: 0,
  inativas: 0,
}

interface Estado {
  readonly categorias: CategoriasSeed
  readonly clientes: ClientesSeed
  readonly departamentos: readonly Departamento[]
  readonly origem: 'local' | 'sync'
}

function fallbackLocal(clienteId: string): Estado {
  if (clienteId === ACME_ID) {
    return {
      categorias: categoriasSeed,
      clientes: clientesSeed,
      departamentos: departamentosSeed.departamentos,
      origem: 'local',
    }
  }
  return {
    categorias: { geradoEm: '', relatorio: RELATORIO_VAZIO, categorias: [] },
    clientes: { geradoEm: '', clientes: {} },
    departamentos: [],
    origem: 'local',
  }
}

// Boundary: doc gravado pela edge function sync-omie.
function docValido(v: unknown): v is DocCadastros {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return Array.isArray(r.categorias) && r.categorias.length > 0 && typeof r.clientes === 'object' && Array.isArray(r.departamentos)
}

export function CadastrosProvider({ children }: { children: ReactNode }) {
  const { ativo } = useClientes()
  const [estado, setEstado] = useState<Estado>(() => fallbackLocal(ativo.id))

  const recarregar = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('painel_estado')
      .select('dados')
      .eq('chave', chaveDoCliente(ativo.id, BASE))
      .maybeSingle()
    if (error) {
      console.error('[cadastros] erro ao ler doc do sync:', error.message)
      return
    }
    const doc = data?.dados
    if (docValido(doc)) {
      setEstado({
        categorias: { geradoEm: doc.geradoEm, relatorio: doc.relatorio ?? RELATORIO_VAZIO, categorias: doc.categorias },
        clientes: { geradoEm: doc.geradoEm, clientes: doc.clientes },
        departamentos: doc.departamentos,
        origem: 'sync',
      })
    }
  }, [ativo.id])

  useEffect(() => {
    setEstado(fallbackLocal(ativo.id))
    void recarregar()
  }, [ativo.id, recarregar])

  const valor = useMemo<CadastrosApi>(
    () => ({
      ...estado,
      nomesContrapartes: new Map(Object.entries(estado.clientes.clientes).map(([codigo, c]) => [codigo, c.nome])),
      estruturaCentros: montarEstruturaCentros(estado.departamentos),
      recarregar,
    }),
    [estado, recarregar],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useCadastros(): CadastrosApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCadastros fora de CadastrosProvider')
  return ctx
}
