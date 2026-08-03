/** @file Camada de overrides de nomes (categoria/contraparte/título) — original Omie nunca é mutado. */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { normalizarHistorico, registrarEdicao, type HistoricoEdicoes } from '@/core/historicoEdicao'
import type { EntidadeEditavel, Overrides, Resolvedor } from '@/core/override'
import { useCadastros } from './cadastros'
import { criarResolvedor } from './resolvedor'
import { useEstadoSincronizado } from './persistencia'
import { useChaveCliente } from './clientes'

const BASE_CHAVE = 'painel-ag-overrides-v1'
const BASE_CHAVE_HISTORICO = 'painel-ag-historico-v1'

interface OverridesCtx {
  readonly overrides: Overrides
  readonly resolvedor: Resolvedor
  /** Trilha de renomes por tenant — alimenta o botão ◷ de histórico (pedido 03/08). */
  readonly historico: HistoricoEdicoes
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
  const chaveHistorico = useChaveCliente(BASE_CHAVE_HISTORICO)
  const { categorias, clientes } = useCadastros()
  const [overrides, setOverrides] = useEstadoSincronizado<Overrides>(chave, normalizar)
  const [historico, setHistorico] = useEstadoSincronizado<HistoricoEdicoes>(chaveHistorico, normalizarHistorico)

  // `setOverrides` é ligado à CHAVE do cliente ativo e trocado quando ela muda. Memoizar com
  // [] congelava o setter do PRIMEIRO render — quando a lista de clientes ainda não chegou e
  // o tenant ativo é o fallback — e todo renome ia parar na chave desse cliente fantasma
  // (6 renomes da DR PIZZA perdidos assim, 2026-07-21). setOverrides TEM que estar nas deps.
  // O `de` do evento é lido FORA do updater (overrides do closure): efeito colateral dentro
  // de updater duplicaria o evento no StrictMode.
  const renomear = useCallback((entidade: EntidadeEditavel, codigo: string, nome: string) => {
    const de = overrides[entidade][codigo] ?? null
    const para = nome.trim() || null
    setHistorico((h) => registrarEdicao(h, { t: new Date().toISOString(), entidade, codigo, de, para }))
    setOverrides((o) => ({ ...o, [entidade]: aplicar(o[entidade], codigo, nome.trim()) }))
  }, [overrides, setOverrides, setHistorico])

  const restaurar = useCallback((entidade: EntidadeEditavel, codigo: string) => {
    const de = overrides[entidade][codigo] ?? null
    setHistorico((h) => registrarEdicao(h, { t: new Date().toISOString(), entidade, codigo, de, para: null }))
    setOverrides((o) => ({ ...o, [entidade]: remover(o[entidade], codigo) }))
  }, [overrides, setOverrides, setHistorico])

  const resolvedor = useMemo(() => criarResolvedor(overrides, categorias.categorias, clientes.clientes), [overrides, categorias, clientes])
  const valor = useMemo<OverridesCtx>(
    () => ({ overrides, resolvedor, historico, renomear, restaurar }),
    [overrides, resolvedor, historico, renomear, restaurar],
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
