/**
 * @file Anel de progresso de UMA medida (% de execução) — não confundir com o Donut de
 * composição. Arco trava em 100%; o número central diz o valor real. Cor pela natureza
 * (R = accent, P = danger), status em texto fica por conta de quem usa.
 */

export function AnelExecucao({ pct, natureza, rotulo }: { pct: number | null; natureza: 'R' | 'P'; rotulo: string }) {
  const R = 26
  const CIRC = 2 * Math.PI * R
  const frac = pct === null ? 0 : Math.min(Math.max(pct, 0), 100) / 100
  const cor = natureza === 'R' ? 'rgb(var(--c-accent))' : 'rgb(var(--c-danger))'
  return (
    <div className="relative h-16 w-16 shrink-0" role="img" aria-label={`${rotulo}: ${pct === null ? 'sem base' : `${pct}%`}`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" stroke="rgb(var(--c-surface2))" />
        {frac > 0 ? (
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            stroke={cor}
            strokeDasharray={`${frac * CIRC} ${CIRC}`}
          />
        ) : null}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums">
        {pct === null ? '—' : `${pct}%`}
      </span>
    </div>
  )
}
