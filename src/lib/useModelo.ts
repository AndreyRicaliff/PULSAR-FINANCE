/** @file Estado da Matriz de Classificações por cliente: estruturas, de-paras e migração de ids aposentados. */
import { useCallback, useMemo } from 'react'
import type { Conciliacao, Dimensao, Modelo, No, RegimeDemo } from '@/core/modelo'
import { ESTRUTURA_PADRAO, reordenarRaiz } from '@/core/modelo'
import { MIGRACAO_NOS } from '@/core/plano-padrao'
import { useCadastros } from './cadastros'
import { useEstadoSincronizado } from './persistencia'
import { useChaveCliente } from './clientes'

const BASE_CHAVE = 'painel-ag-modelo-v4'

// Core fica puro; aqui injetamos a estrutura de filiais vinda do cadastro Omie (runtime).
// O padrão de centros é capturado quando a chave hidrata — modelo SALVO nunca é tocado;
// tenant novo vê a estrutura da Omie após o 1º sync (ou na próxima carga).
function padraoDim(estruturaCentros: readonly No[]): Readonly<Record<Dimensao, readonly No[]>> {
  return { ...ESTRUTURA_PADRAO, centros: estruturaCentros }
}

function normalizarCom(bruto: unknown, padrao: Readonly<Record<Dimensao, readonly No[]>>): Modelo {
  const m = (bruto ?? {}) as Partial<Modelo>
  return {
    contas: comPadrao(m.contas, 'contas', padrao),
    fornecedores: comPadrao(m.fornecedores, 'fornecedores', padrao),
    centros: comPadrao(m.centros, 'centros', padrao),
  }
}

// Estrutura vazia → semeia o padrão da dimensão; preserva o de-para já feito
// (migrando nós aposentados pela Matriz de Classificação para o destino atual).
function comPadrao(c: Conciliacao | undefined, dim: Dimensao, padrao: Readonly<Record<Dimensao, readonly No[]>>): Conciliacao {
  const mapa = migrarMapa(c?.mapa ?? {})
  if (c?.estrutura?.length) return { estrutura: c.estrutura, mapa }
  return { estrutura: padrao[dim], mapa }
}

function migrarMapa(mapa: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, MIGRACAO_NOS[v] ?? v]))
}

export interface ModeloApi {
  readonly modelo: Modelo
  readonly addNo: (dim: Dimensao, nome: string, paiId: string | null, regime?: RegimeDemo) => void
  readonly removeNo: (dim: Dimensao, id: string) => void
  readonly renomearNo: (dim: Dimensao, id: string, nome: string) => void
  /** Move o grupo-raiz `id` para a posição `novoIndice` e renumera os nomes (número = posição). */
  readonly reordenarNo: (dim: Dimensao, id: string, novoIndice: number) => void
  /** Define em quais demonstrações o grupo entra (DRE/DFC/ambos). */
  readonly definirRegime: (dim: Dimensao, id: string, regime: RegimeDemo) => void
  readonly mapear: (dim: Dimensao, chave: string, noId: string) => void
  readonly desmapear: (dim: Dimensao, chave: string) => void
  readonly restaurar: (dim: Dimensao) => void
}

export function useModelo(): ModeloApi {
  const chave = useChaveCliente(BASE_CHAVE)
  const { estruturaCentros } = useCadastros()
  const padrao = useMemo(() => padraoDim(estruturaCentros), [estruturaCentros])
  const normalizar = useCallback((bruto: unknown) => normalizarCom(bruto, padrao), [padrao])
  const [modelo, setModelo] = useEstadoSincronizado<Modelo>(chave, normalizar)

  const aplicar = useCallback((dim: Dimensao, fn: (c: Conciliacao) => Conciliacao) => {
    setModelo((m) => ({ ...m, [dim]: fn(m[dim]) }))
  }, [])

  const addNo = useCallback(
    (dim: Dimensao, nome: string, paiId: string | null, regime?: RegimeDemo) => {
      const limpo = nome.trim()
      if (!limpo) return
      // Regime (DRE/DFC/ambos) é livre por grupo E por subgrupo; ausente = herda/ambos.
      const meta = regime ? { regime } : undefined
      aplicar(dim, (c) => ({
        ...c,
        estrutura: [...c.estrutura, { id: crypto.randomUUID(), nome: limpo, paiId, meta }],
      }))
    },
    [aplicar],
  )

  const definirRegime = useCallback(
    (dim: Dimensao, id: string, regime: RegimeDemo) => {
      aplicar(dim, (c) => ({
        ...c,
        estrutura: c.estrutura.map((n) => (n.id === id ? { ...n, meta: { ...n.meta, regime } } : n)),
      }))
    },
    [aplicar],
  )

  const removeNo = useCallback(
    (dim: Dimensao, id: string) => {
      aplicar(dim, (c) => {
        const remover = new Set([id, ...c.estrutura.filter((n) => n.paiId === id).map((n) => n.id)])
        return {
          estrutura: c.estrutura.filter((n) => !remover.has(n.id)),
          mapa: filtrarMapa(c.mapa, (noId) => !remover.has(noId)),
        }
      })
    },
    [aplicar],
  )

  // Troca só o rótulo: id/paiId/meta intactos → de-paras e DRE/DFC não se movem.
  const renomearNo = useCallback(
    (dim: Dimensao, id: string, nome: string) => {
      const limpo = nome.trim()
      if (!limpo) return
      aplicar(dim, (c) => ({
        ...c,
        estrutura: c.estrutura.map((n) => (n.id === id ? { ...n, nome: limpo } : n)),
      }))
    },
    [aplicar],
  )

  // Reordena grupos-raiz e renumera os nomes pela nova posição (número = posição).
  const reordenarNo = useCallback(
    (dim: Dimensao, id: string, novoIndice: number) => {
      aplicar(dim, (c) => ({ ...c, estrutura: reordenarRaiz(c.estrutura, id, novoIndice) }))
    },
    [aplicar],
  )

  const mapear = useCallback(
    (dim: Dimensao, chave: string, noId: string) => {
      aplicar(dim, (c) => ({ ...c, mapa: { ...c.mapa, [chave]: noId } }))
    },
    [aplicar],
  )

  const desmapear = useCallback(
    (dim: Dimensao, chave: string) => {
      aplicar(dim, (c) => ({ ...c, mapa: filtrarMapa(c.mapa, (_, k) => k !== chave) }))
    },
    [aplicar],
  )

  const restaurar = useCallback(
    (dim: Dimensao) => {
      aplicar(dim, (c) => ({ ...c, estrutura: padrao[dim] }))
    },
    [aplicar, padrao],
  )

  return { modelo, addNo, removeNo, renomearNo, reordenarNo, definirRegime, mapear, desmapear, restaurar }
}

function filtrarMapa(
  mapa: Readonly<Record<string, string>>,
  manter: (noId: string, chave: string) => boolean,
): Record<string, string> {
  return Object.fromEntries(Object.entries(mapa).filter(([k, noId]) => manter(noId, k)))
}

export type { No }
