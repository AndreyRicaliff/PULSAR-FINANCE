/**
 * @file Tabela de demonstração (DRE/DFC) com drill-down: linha → grupos que a compõem →
 * subgrupos. Compartilhada entre RelatorioDRE, RelatorioDFC e o Painel do Editado.
 * base = denominador da análise vertical (0 oculta a coluna AV%).
 */
import { useMemo, useState } from 'react'
import type { LinhaCalc } from '@/core/demonstracao'
import type { GrupoEspelho } from '@/lib/resultado'
import { Linha } from './TabelaDemonstracaoLinhas.tsx'
import type { AlvoDetalhe } from './useDetalheDemonstracao.tsx'

interface Props {
  readonly titulo?: string
  readonly linhas: readonly LinhaCalc[]
  readonly grupos: readonly GrupoEspelho[]
  readonly base?: number
  /** Mesmas linhas no período anterior equivalente — liga a coluna Δ (análise horizontal). */
  readonly anterior?: readonly LinhaCalc[]
  /** Abre o dashboard de fontes do valor (fornecedores + transações) — coluna de lupa no fim. */
  readonly onDetalhar?: (alvo: AlvoDetalhe) => void
}

export function TabelaDemonstracao({ titulo, linhas, grupos, base = 0, anterior, onDetalhar }: Props) {
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(new Set())
  const porId = useMemo(() => new Map(grupos.map((g) => [g.id, g])), [grupos])
  const anteriorPorId = useMemo(
    () => (anterior ? new Map(anterior.map((l) => [l.id, l.valorCentavos])) : null),
    [anterior],
  )

  function alternar(id: string) {
    setAbertas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <div className="overflow-hidden rounded-card border border-bd bg-surface">
      {titulo ? (
        <h2 className="border-b border-bd px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {titulo}
        </h2>
      ) : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bd text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 text-left font-semibold">Descrição</th>
            {anteriorPorId ? (
              <th className="px-4 py-2.5 text-right font-semibold" title="Análise horizontal: variação vs o período imediatamente anterior de mesma duração">
                Δ ant.
              </th>
            ) : null}
            {base ? <th className="px-4 py-2.5 text-right font-semibold">AV%</th> : null}
            <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
            {onDetalhar ? <th className="w-10" /> : null}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <Linha
              key={l.id}
              l={l}
              base={base}
              porId={porId}
              valorAnterior={anteriorPorId ? (anteriorPorId.get(l.id) ?? 0) : null}
              aberta={abertas.has(l.id)}
              onAlternar={alternar}
              onDetalhar={onDetalhar}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
