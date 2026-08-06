/**
 * @file Rodapé de partidas neutras da DRE/DFC (pedido 06/08: "sempre aparecer nos regimes
 * mas sem interferir nos valores"). Separado da tabela por uma borda e sem coluna de
 * subtotal — a leitura precisa deixar óbvio que nada aqui entra na cascata acima.
 */
import { brl } from '@/lib/money'
import type { PartidaNeutra } from '@/core/demonstracao'

export function PartidasNeutrasBloco({ itens, tipo }: { itens: readonly PartidaNeutra[]; tipo: 'DRE' | 'DFC' }) {
  if (itens.length === 0) return null
  return (
    <section className="rounded-card border border-dashed border-bd bg-surface/60 p-4">
      <header className="mb-2 flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-semibold text-muted">Partidas neutras</h3>
        <span className="rounded bg-surface2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          fora do total
        </span>
      </header>
      <p className="mb-3 text-xs text-muted">
        Transferências, aportes e estornos do período. Aparecem para rastreabilidade e{' '}
        <strong className="text-text">não somam</strong> em nenhuma linha da {tipo} acima.
      </p>
      <ul className="flex flex-col divide-y divide-bd/60">
        {itens.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="min-w-0 truncate text-muted">{p.nome}</span>
            <span className="shrink-0 tabular-nums text-muted">{brl(p.valorCentavos)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
