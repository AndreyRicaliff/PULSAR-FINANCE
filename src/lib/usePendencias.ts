/**
 * @file As três filas de trabalho do cliente ativo, para os badges da sidebar e o Início.
 *
 * Regra inegociável (revisão 07/08): badge só renderiza com número REAL > 0 — nunca zero,
 * nunca dado fabricado. Órfãs e duplicidades saem do dado já carregado (custo zero);
 * aprovações pendentes é uma contagem head-only no banco, por cliente ativo.
 */
import { useEffect, useMemo, useState } from 'react'
import { gruposDuplicados, type MembroDuplicata } from '@/core/duplicatas'
import { chaveContraparte } from '@/core/movimento'
import { orfasDaConciliacao } from '@/core/orfaos'
import { useCadastros } from './cadastros'
import { useClientes } from './clientes'
import { useDuplicatasIgnoradas } from './duplicatasDoc'
import { useMovimentos } from './movimentos'
import { useModelo } from './useModelo'
import { useOverrides } from './overrides'
import { supabase } from './supabase'

export interface Pendencias {
  /** Aprovações de pagamento aguardando decisão do cliente ativo. */
  readonly aprovacoes: number
  /** Categorias órfãs na Matriz (mapeadas para nó que não existe mais). */
  readonly orfas: number
  /** Grupos de contrapartes com nome duplicado (mesmo detector da aba Contrapartes). */
  readonly duplicidades: number
}

export function usePendencias(): Pendencias {
  const { ativo } = useClientes()
  const { modelo } = useModelo()
  const { categorias: cad } = useCadastros()
  const { movimentos } = useMovimentos()
  const { resolvedor } = useOverrides()
  const { ignoradas } = useDuplicatasIgnoradas()

  const orfas = useMemo(
    () => orfasDaConciliacao(modelo, cad.categorias, movimentos).length,
    [modelo, cad.categorias, movimentos],
  )

  const duplicidades = useMemo(() => {
    const acc = new Map<string, { total: number; qtd: number }>()
    for (const m of movimentos) {
      const codigo = chaveContraparte(m)
      const atual = acc.get(codigo) ?? { total: 0, qtd: 0 }
      atual.total += m.valorCentavos
      atual.qtd += 1
      acc.set(codigo, atual)
    }
    const membros: MembroDuplicata[] = [...acc.entries()].map(([codigo, v]) => {
      const r = resolvedor.contraparte(codigo)
      return { codigo, nome: r.nome, estado: r.estado, totalCentavos: v.total, qtd: v.qtd }
    })
    return gruposDuplicados(membros, ignoradas).length
  }, [movimentos, resolvedor, ignoradas])

  const [aprovacoes, setAprovacoes] = useState(0)
  useEffect(() => {
    // head-only: só a contagem viaja. Sem supabase (offline/apresentação) fica 0 — sem badge.
    if (!supabase) return
    let vivo = true
    void supabase
      .from('painel_aprovacoes')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', ativo.id)
      .eq('status', 'pendente')
      .then(({ count }) => {
        if (vivo) setAprovacoes(count ?? 0)
      })
    return () => {
      vivo = false
    }
  }, [ativo.id])

  return { aprovacoes, orfas, duplicidades }
}
