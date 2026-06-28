/** @file Camada de overrides de nomes (categoria/contraparte/título) — original Omie nunca é mutado. */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type { EntidadeEditavel, Overrides, Resolvedor } from '@/core/override'
import { useCadastros } from './cadastros'
import { criarResolvedor } from './resolvedor'
import { useEstadoSincronizado } from './persistencia'
import { useChaveCliente } from './clientes'

const BASE_CHAVE = 'painel-ag-overrides-v1'

interface OverridesCtx {
  readonly overrides: Overrides
  readonly resolvedor: Resolvedor
  readonly renomear: (entidade: EntidadeEditavel, codigo: string, nome: string) => void
  readonly restaurar: (entidade: EntidadeEditavel, codigo: string) => void
}

const Ctx = createContext<OverridesCtx | null>(null)

function normalizar(bruto: unknown): Overrides {
  const o = (bruto ?? {}) as Partial<Overrides>
  return { categoria: o.categoria ?? {}, contraparte: o.contraparte ?? {}, titulo: o.titulo ?? {} }
}

export function OverridesProvider({ children }: { children: ReactNode }) {
  const chave = useChaveCliente(BASE_CHAVE)
  const { categorias, clientes } = useCadastros()
  const [overrides, setOverrides] = useEstadoSincronizado<Overrides>(chave, normalizar)

  const renomear = useCallback((entidade: EntidadeEditavel, codigo: string, nome: string) => {
    setOverrides((o) => ({ ...o, [entidade]: aplicar(o[entidade], codigo, nome.trim()) }))
  }, [])

  const restaurar = useCallback((entidade: EntidadeEditavel, codigo: string) => {
    setOverrides((o) => ({ ...o, [entidade]: remover(o[entidade], codigo) }))
  }, [])

  const resolvedor = useMemo(() => criarResolvedor(overrides, categorias.categorias, clientes.clientes), [overrides, categorias, clientes])
  const valor = useMemo<OverridesCtx>(
    () => ({ overrides, resolvedor, renomear, restaurar }),
    [overrides, resolvedor, renomear, restaurar],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useOverrides(): OverridesCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOverrides precisa estar dentro de <OverridesProvider>')
  return ctx
}

function aplicar(mapa: Readonly<Record<string, string>>, codigo: string, nome: string): Record<string, string> {
  if (!nome) return remover(mapa, codigo)
  return { ...mapa, [codigo]: nome }
}

function remover(mapa: Readonly<Record<string, string>>, codigo: string): Record<string, string> {
  const copia = { ...mapa }
  delete copia[codigo]
  return copia
}
