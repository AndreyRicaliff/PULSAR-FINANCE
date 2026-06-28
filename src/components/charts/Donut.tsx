/** @file Rosca de composição com legenda — SVG puro, tokens AG, tooltip rico. */
import type React from 'react'
import type { Fatia } from '@/lib/graficos'
import { brl } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico, type TooltipGrafico } from '@/lib/tooltipGrafico'

export const PALETA: readonly string[] = [
  '#401C7F',
  '#9187B6',
  '#7FB89C',
  '#C9A227',
  '#E1746B',
  '#5B6B9E',
  '#6F5AA6',
  '#3F8F86',
  '#B08FC7',
  '#8C8A99',
]

const R = 70
const CIRC = 2 * Math.PI * R
const GAP = 2

interface Slice {
  readonly label: string
  readonly cor: string
  readonly len: number
  readonly offset: number
  readonly valor: number
  readonly pct: number
}

function fatiar(fatias: readonly Fatia[], total: number): readonly Slice[] {
  let offset = 0
  return fatias.map((f, i) => {
    const seg = (CIRC * f.valorCentavos) / total
    const slice: Slice = {
      label: f.label,
      cor: PALETA[i % PALETA.length] ?? '#401C7F',
      len: Math.max(0, seg - GAP),
      offset,
      valor: f.valorCentavos,
      pct: Math.round((f.valorCentavos / total) * 100),
    }
    offset += seg
    return slice
  })
}

export function Donut({ fatias, tamanho = 176 }: { fatias: readonly Fatia[]; tamanho?: number }) {
  const tip = useTooltipGrafico()
  const total = fatias.reduce((a, f) => a + f.valorCentavos, 0)
  if (total <= 0) return <p className="text-sm text-muted">Sem despesas conciliadas.</p>
  const slices = fatiar(fatias, total)
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Rosca slices={slices} total={total} tip={tip} tamanho={tamanho} />
      <Legenda slices={slices} />
      {tip.tooltip}
    </div>
  )
}

interface PropsRosca {
  readonly slices: readonly Slice[]
  readonly total: number
  readonly tip: TooltipGrafico
  readonly tamanho: number
}

function Rosca({ slices, total, tip, tamanho }: PropsRosca) {
  // Delay acumulado: cada fatia começa quando a anterior terminou (~0.5s por fatia, escalonado).
  let delayAcum = 0
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 180 180" style={{ width: tamanho, height: tamanho, filter: 'drop-shadow(0 2px 6px rgb(0 0 0 / 0.2))' }}>
        <g transform="rotate(-90 90 90)">
          {slices.map((s) => {
            // Proporção da fatia em relação ao total → delay proporcional ao arco.
            const delay = delayAcum
            delayAcum += (s.len / CIRC) * 0.5
            return (
              <circle
                key={s.label}
                cx="90"
                cy="90"
                r={R}
                fill="none"
                stroke={s.cor}
                strokeWidth="26"
                strokeLinecap="round"
                strokeDashoffset={-s.offset}
                className="anim-donut-fatia cursor-pointer transition-opacity duration-200 hover:opacity-75"
                style={
                  {
                    '--len': `${s.len}`,
                    '--circ': `${CIRC}`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${Math.max(0.18, (s.len / CIRC) * 0.5)}s`,
                  } as React.CSSProperties
                }
                onMouseMove={(e) =>
                  tip.mostrar(
                    e,
                    <>
                      <TipTitulo>{s.label}</TipTitulo>
                      <TipLinha rotulo="Valor" valor={brl(s.valor)} />
                      <TipLinha rotulo="Participação" valor={`${s.pct}% do total`} />
                    </>,
                  )
                }
                onMouseLeave={tip.esconder}
              />
            )
          })}
        </g>
      </svg>
      <div className="anim-donut-total pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-wide text-muted">Total</span>
        <span className="text-sm font-bold tabular-nums">{brl(total)}</span>
      </div>
    </div>
  )
}

function Legenda({ slices }: { slices: readonly Slice[] }) {
  return (
    <ul className="flex flex-1 flex-col gap-0.5 text-sm">
      {slices.map((s) => (
        <li key={s.label} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors hover:bg-surface2/60">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: s.cor }} />
            {s.label}
          </span>
          <span className="tabular-nums text-muted">
            {brl(s.valor)} · {s.pct}%
          </span>
        </li>
      ))}
    </ul>
  )
}
