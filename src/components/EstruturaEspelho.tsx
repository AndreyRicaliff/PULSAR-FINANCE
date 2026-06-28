/** @file Espelho da estrutura AG conciliada com totais por grupo/subgrupo. */
import { etiquetasContabeis } from '@/core/modelo'
import { brl } from '@/lib/money'
import type { GrupoEspelho } from '@/lib/resultado'

export function EstruturaEspelho({ grupos }: { grupos: readonly GrupoEspelho[] }) {
  if (grupos.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
        Nada conciliado ainda — concilie em "Matriz de Classificações" para o espelho aparecer.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {grupos.map((g) => (
        <GrupoCard key={g.id} grupo={g} />
      ))}
    </div>
  )
}

function GrupoCard({ grupo }: { grupo: GrupoEspelho }) {
  const etiquetas = etiquetasContabeis(grupo.meta)
  return (
    <div className="overflow-hidden rounded-card border border-bd bg-surface">
      <div className="flex items-center justify-between border-b border-bd px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{grupo.nome}</span>
          {etiquetas.map((t) => (
            <span key={t} className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-medium text-secondary">
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{grupo.qtd} mov.</span>
          <span className={`font-bold tabular-nums ${grupo.totalCentavos < 0 ? 'text-danger' : ''}`}>
            {brl(grupo.totalCentavos)}
          </span>
        </div>
      </div>
      {grupo.subgrupos.map((s) => (
        <div key={s.id} className="flex items-center justify-between border-b border-bd/40 px-4 py-2 pl-8 text-sm last:border-0">
          <span className="text-secondary">↳ {s.nome}</span>
          <span className="flex items-center gap-3">
            <span className="text-xs text-muted">{s.qtd}</span>
            <span className={`tabular-nums ${s.totalCentavos < 0 ? 'text-danger' : 'text-muted'}`}>
              {brl(s.totalCentavos)}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
