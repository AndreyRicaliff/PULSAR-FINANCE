/**
 * @file Drill "fontes do valor" das demonstrações: dado um conjunto de nós da estrutura
 * (linha, grupo ou subgrupo), abre o MovimentosModal com os movimentos que compõem o valor,
 * agrupados por fornecedor (contraparte) — transações por fornecedor a um clique.
 */
import { useMemo, useState, type ReactNode } from 'react'
import type { Categoria } from '@/core/categoria'
import { classeDe } from '@/core/classes'
import type { Conciliacao } from '@/core/modelo'
import type { Movimento } from '@/core/movimento'
import { MovimentosModal } from './MovimentosModal.tsx'

export interface AlvoDetalhe {
  readonly titulo: string
  /** Nós da estrutura cujos movimentos compõem o valor (subgrupos dos nós entram juntos). */
  readonly ids?: readonly string[]
  /** Código da agrupadora Omie (classe): filtra os movimentos por classe, não por nó. */
  readonly classe?: string
}

export interface DetalheApi {
  readonly detalhar: (alvo: AlvoDetalhe) => void
  readonly modal: ReactNode
}

export function useDetalheDemonstracao(
  movimentos: readonly Movimento[],
  conc: Conciliacao,
  categorias: readonly Categoria[],
): DetalheApi {
  const [alvo, setAlvo] = useState<AlvoDetalhe | null>(null)

  const selecionados = useMemo(() => {
    if (!alvo || (!alvo.classe && !alvo.ids?.length)) return []
    const ids = new Set(alvo.ids ?? [])
    // Grupo selecionado arrasta os subgrupos — espelha o total exibido na tabela.
    for (const n of conc.estrutura) if (n.paiId && ids.has(n.paiId)) ids.add(n.id)
    // Classe + nó: a lupa da classe escopa pelo SUBGRUPO (ids) E pela agrupadora (classe),
    // espelhando a linha "classe dentro do subgrupo" do drill — não a união global da classe.
    const catPorCodigo = alvo.classe ? new Map(categorias.map((c) => [c.codigo, c])) : null
    return movimentos.filter((m) => {
      if (catPorCodigo && classeDe(m.categoria, catPorCodigo)?.codigo !== alvo.classe) return false
      if (ids.size) {
        const noId = conc.mapa[m.categoria]
        if (noId === undefined || !ids.has(noId)) return false
      }
      return true
    })
  }, [alvo, movimentos, conc, categorias])

  const modal = alvo ? (
    <MovimentosModal
      titulo={alvo.titulo}
      subtitulo="Fontes do valor · agrupado por fornecedor — expanda para ver as transações"
      movimentos={selecionados}
      eixosIniciais={['contraparte']}
      onFechar={() => setAlvo(null)}
    />
  ) : null

  return { detalhar: setAlvo, modal }
}
