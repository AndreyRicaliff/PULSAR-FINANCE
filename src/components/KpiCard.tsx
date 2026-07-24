/** @file Card de KPI padrão AG (v3 sóbrio): borda superior colorida, tendência, mini-gráfico mensal e análise. */
import { useState } from 'react'
import { useContagem } from '@/lib/useContagem'
import type { PontoIndicador } from '@/lib/indicadores'
import { AnaliseIndicador } from './AnaliseIndicador.tsx'
import { MiniSerie } from './charts/MiniSerie.tsx'

export type CorKpi = 'primary' | 'accent' | 'danger' | 'secondary' | 'warn'

interface Estilo {
  readonly borda: string
  readonly neon: string
}

// Classes fx-neon-* literais (não interpoladas) p/ o Tailwind não tree-shake do @layer utilities.
const ESTILO: Readonly<Record<CorKpi, Estilo>> = {
  primary: { borda: 'border-t-primary', neon: 'fx-neon-primary' },
  accent: { borda: 'border-t-accent', neon: 'fx-neon-accent' },
  danger: { borda: 'border-t-danger', neon: 'fx-neon-danger' },
  secondary: { borda: 'border-t-secondary', neon: 'fx-neon-secondary' },
  warn: { borda: 'border-t-warn', neon: 'fx-neon-warn' },
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
  // Count-up 1x na entrada (§4). Preserva o texto formatado; '—' nao vira 0 contando.
  const exibido = useContagem(String(valor))
  const [analise, setAnalise] = useState(false)
  const expansivel = serie !== undefined && serie.length >= 2
  return (
    <div className={`card-hover fx-tile anim-pop mk-kpi relative min-w-0 overflow-hidden border border-bd border-t-2 ${e.borda} px-5 py-4`}>
      <div className="relative flex items-start justify-between gap-2">
        <p className="mk-kpi__label">{rotulo}</p>
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
      <p className={`${e.neon} mk-kpi__valor relative mt-2 break-words`}>{exibido}</p>
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
