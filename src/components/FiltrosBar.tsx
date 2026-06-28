/** @file Filtros rápidos por campo cru do movimento (natureza/status/origem/liquidado). */
import type { Movimento } from '@/core/movimento'
import {
  CAMPOS_FILTRO,
  FILTROS_VAZIOS,
  temFiltro,
  valoresDistintos,
  type CampoFiltro,
  type Filtros,
} from '@/lib/filtros'

interface Props {
  readonly movimentos: readonly Movimento[]
  readonly filtros: Filtros
  readonly onChange: (f: Filtros) => void
}

const ROTULO_CAMPO: Readonly<Record<CampoFiltro, string>> = {
  natureza: 'Natureza',
  status: 'Status',
  origem: 'Origem',
  liquidado: 'Situação',
}

const ROTULO_VALOR: Readonly<Record<string, string>> = {
  P: 'A pagar',
  R: 'A receber',
  S: 'Pago / Recebido',
  N: 'Em aberto',
}

function rotuloValor(v: string): string {
  return ROTULO_VALOR[v] ?? v
}

export function FiltrosBar({ movimentos, filtros, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-card border border-bd bg-surface p-3">
      {CAMPOS_FILTRO.map((campo) => (
        <Campo
          key={campo}
          campo={campo}
          opcoes={valoresDistintos(movimentos, campo)}
          valor={filtros[campo]}
          onChange={(v) => onChange({ ...filtros, [campo]: v })}
        />
      ))}
      {temFiltro(filtros) ? (
        <button
          type="button"
          onClick={() => onChange(FILTROS_VAZIOS)}
          className="ml-auto rounded-lg border border-bd px-3 py-1.5 text-sm text-muted hover:text-text"
        >
          Limpar filtros
        </button>
      ) : null}
    </div>
  )
}

function Campo({
  campo,
  opcoes,
  valor,
  onChange,
}: {
  campo: CampoFiltro
  opcoes: readonly string[]
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {ROTULO_CAMPO[campo]}
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
      >
        <option value="">Todos</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {rotuloValor(o)}
          </option>
        ))}
      </select>
    </label>
  )
}
