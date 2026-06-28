/** @file Card de KPI padrão AG: borda colorida, glow, tendência, mini-gráfico mensal e análise profunda. */
import { useState } from 'react'
import type { PontoIndicador } from '@/lib/indicadores'
import { AnaliseIndicador } from './AnaliseIndicador.tsx'
import { MiniSerie } from './charts/MiniSerie.tsx'

export type CorKpi = 'primary' | 'accent' | 'danger' | 'secondary' | 'warn'

interface Estilo {
  readonly borda: string
  readonly glow: string
  readonly neon: string
}

// Classes fx-neon-* literais (não interpoladas) p/ o Tailwind não tree-shake do @layer utilities.
const ESTILO: Readonly<Record<CorKpi, Estilo>> = {
  primary: { borda: 'border-t-primary', glow: 'rgb(var(--c-primary) / 0.18)', neon: 'fx-neon-primary' },
  accent: { borda: 'border-t-accent', glow: 'rgb(var(--c-accent) / 0.18)', neon: 'fx-neon-accent' },
  danger: { borda: 'border-t-danger', glow: 'rgb(var(--c-danger) / 0.18)', neon: 'fx-neon-danger' },
  secondary: { borda: 'border-t-secondary', glow: 'rgb(var(--c-secondary) / 0.18)', neon: 'fx-neon-secondary' },
  warn: { borda: 'border-t-warn', glow: 'rgb(var(--c-warn) / 0.18)', neon: 'fx-neon-warn' },
}

interface Props {
  readonly rotulo: string
  readonly valor: number | string
  readonly cor: CorKpi
  readonly nota?: string
  readonly tendencia?: number
  /** Série mensal do indicador (valores reais) — vira mini-gráfico com meses e média. */
  readonly serie?: readonly PontoIndicador[]
}

// KPI card padrão AG: borda colorida superior + glow da cor + hover-lift. tendencia (delta %) e
// serie só são renderizadas quando vier dado real — nunca fabricar.
export function KpiCard({ rotulo, valor, cor, nota, tendencia, serie }: Props) {
  const e = ESTILO[cor]
  const [analise, setAnalise] = useState(false)
  const expansivel = serie !== undefined && serie.length >= 2
  return (
    <div className={`card-hover fx-tile anim-pop relative min-w-0 overflow-hidden rounded-card border border-bd border-t-[3px] ${e.borda} bg-surface px-5 py-4`}>
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: e.glow }} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{rotulo}</p>
        <span className="flex items-center gap-1.5">
          {tendencia === undefined ? null : <Tendencia valor={tendencia} />}
          {expansivel ? (
            <button
              type="button"
              onClick={() => setAnalise(true)}
              title="Analisar a fundo"
              aria-label={`Analisar a fundo: ${rotulo}`}
              className="fx-press grid h-6 w-6 place-items-center rounded-md border border-bd text-muted transition-colors hover:border-primary hover:text-text"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          ) : null}
        </span>
      </div>
      <p className={`${e.neon} font-apoio relative mt-2 break-words text-2xl font-semibold tabular-nums`}>{valor}</p>
      {serie && serie.length >= 2 ? (
        <div className="relative mt-2">
          <MiniSerie pontos={serie} cor={`rgb(var(--c-${cor}))`} />
        </div>
      ) : null}
      {nota ? <p className="relative mt-1 text-[11px] text-muted">{nota}</p> : null}
      {analise && serie ? (
        <AnaliseIndicador
          rotulo={rotulo}
          valorAtual={String(valor)}
          nota={nota}
          cor={`rgb(var(--c-${cor}))`}
          serie={serie}
          onFechar={() => setAnalise(false)}
        />
      ) : null}
    </div>
  )
}

function Tendencia({ valor }: { valor: number }) {
  const positivo = valor >= 0
  const cls = positivo ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}>
      {positivo ? '▲' : '▼'} {Math.abs(valor)}%
    </span>
  )
}
