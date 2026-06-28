/** @file Seletor encadeado de eixos de agrupamento do drill-down. */
import { EIXOS, type Eixo } from './rotulos'

interface Props {
  readonly eixos: readonly Eixo[]
  readonly onChange: (e: Eixo[]) => void
}

export function EixoChain({ eixos, onChange }: Props) {
  const disponiveis = EIXOS.filter((e) => !eixos.includes(e.id))
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted">Ramificar por</span>
      {eixos.map((id, i) => (
        <Chip key={id} id={id} ordem={i + 1} onRemover={() => onChange(eixos.filter((x) => x !== id))} />
      ))}
      {disponiveis.length > 0 ? (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...eixos, e.target.value as Eixo])}
          className="rounded-lg border border-bd bg-surface2 px-2 py-1 text-xs text-text outline-none focus:border-primary"
        >
          <option value="">+ nível</option>
          {disponiveis.map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo}
            </option>
          ))}
        </select>
      ) : null}
      {eixos.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-muted hover:text-text"
        >
          limpar
        </button>
      ) : null}
    </div>
  )
}

function Chip({ id, ordem, onRemover }: { id: Eixo; ordem: number; onRemover: () => void }) {
  const rotulo = EIXOS.find((e) => e.id === id)?.rotulo ?? id
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-secondary">
      {ordem}. {rotulo}
      <button type="button" onClick={onRemover} className="leading-none hover:text-danger">
        ×
      </button>
    </span>
  )
}
