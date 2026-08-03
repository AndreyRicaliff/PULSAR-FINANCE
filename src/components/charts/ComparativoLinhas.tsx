/**
 * @file Linhas mensais SOBREPOSTAS para o Comparativo de CAPEX — 2 a 5 séries no mesmo
 * eixo (a comparação é a leitura). Mesma âncora do LinhaTempo: eixo Y com valores e
 * gridlines recessivas, zero em destaque quando alguma série cruza o sinal, tooltip por
 * proximidade no eixo X listando TODAS as séries do mês. Tracejada = estimativa/previsto
 * (nunca dado real); `null` = mês sem fonte — a linha QUEBRA em vez de fingir zero.
 * Geometria por largura medida (escala 1:1) + fator vertical do modal.
 */
import { useState, type MouseEvent } from 'react'
import type { SerieDesenho } from '@/core/capexComparativo'
import { brlCompacto, ticksDoEixo } from '@/core/eixo'
import { useEscalaGrafico } from '@/lib/escalaGrafico'
import { brl } from '@/lib/money'
import { TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'
import { useLarguraGrafico } from '@/lib/useLarguraGrafico'

const H_BASE = 240
const PAD_E = 56
const PAD_D = 16
const PAD_V = 28

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`

export function ComparativoLinhas({ meses, series }: { meses: readonly string[]; series: readonly SerieDesenho[] }) {
  const tip = useTooltipGrafico()
  const [ativo, setAtivo] = useState<number | null>(null)
  const { ref, largura: W } = useLarguraGrafico()
  const H = Math.round(H_BASE * useEscalaGrafico())
  if (meses.length < 2 || series.length === 0) {
    return <p className="text-sm text-muted">Poucos meses no período — amplie o intervalo para comparar as séries.</p>
  }

  const n = meses.length
  const valores = series.flatMap((s) => s.valores).filter((v): v is number => v !== null)
  const max = Math.max(0, ...valores)
  const min = Math.min(0, ...valores)
  const span = max - min || 1
  const x = (i: number) => PAD_E + (i / (n - 1)) * (W - PAD_E - PAD_D)
  const y = (v: number) => H - PAD_V - ((v - min) / span) * (H - 2 * PAD_V)
  const ticks = ticksDoEixo(min, max)
  const cruzaZero = min < 0 && max > 0

  function aoMover(e: MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const xvb = ((e.clientX - r.left) / r.width) * W
    const i = Math.min(n - 1, Math.max(0, Math.round(((xvb - PAD_E) / (W - PAD_E - PAD_D)) * (n - 1))))
    setAtivo(i)
    tip.mostrar(
      e,
      <>
        <TipTitulo>{rotuloMes(meses[i]!)}</TipTitulo>
        {series.map((s) => {
          const v = s.valores[i]
          if (v === null || v === undefined) return null
          return (
            <div key={s.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: s.cor }} />
                {s.rotulo}
                {s.tracejada ? ' (estimativa)' : ''}
              </span>
              <span className="tabular-nums">{brl(v)}</span>
            </div>
          )
        })}
      </>,
    )
  }
  function aoSair() {
    setAtivo(null)
    tip.esconder()
  }

  const passoX = Math.max(1, Math.ceil((56 * (n - 1)) / Math.max(1, W - PAD_E - PAD_D)))

  return (
    <div ref={ref} className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span
              className="w-4 border-t-2"
              style={{ borderColor: s.cor, borderTopStyle: s.tracejada ? 'dashed' : 'solid' }}
            />
            {s.rotulo}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block" onMouseMove={aoMover} onMouseLeave={aoSair}>
        {ticks.map((t) => (
          <g key={`t-${t}`}>
            <line x1={PAD_E} y1={y(t)} x2={W - PAD_D} y2={y(t)} stroke="rgb(var(--c-bd))" strokeWidth="0.5" strokeOpacity={t === 0 ? 0 : 0.55} />
            <text x={PAD_E - 6} y={y(t) + 3} textAnchor="end" className="fill-muted tabular-nums" style={{ fontSize: 8.5 }}>
              {brlCompacto(t)}
            </text>
          </g>
        ))}

        {/* Zero em destaque quando alguma série cruza o sinal — âncora de leitura. */}
        <line x1={PAD_E} y1={y(0)} x2={W - PAD_D} y2={y(0)} stroke="rgb(var(--c-bd))" strokeWidth={cruzaZero ? 1.5 : 1} strokeOpacity={cruzaZero ? 0.9 : 0.7} />

        {ativo !== null ? <line x1={x(ativo)} y1={PAD_V / 2} x2={x(ativo)} y2={H - PAD_V} stroke="rgb(var(--c-muted))" strokeWidth="1" strokeOpacity="0.35" /> : null}

        {series.map((s) => (
          <path
            key={s.id}
            d={tracoComQuebras(s.valores, x, y)}
            fill="none"
            stroke={s.cor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.tracejada ? '6 5' : undefined}
            strokeOpacity={s.tracejada ? 0.75 : 1}
          />
        ))}

        {series.map((s) =>
          s.valores.map((v, i) =>
            v !== null && v !== undefined && (i === ativo || n <= 14) ? (
              <circle
                key={`${s.id}-${meses[i]}`}
                cx={x(i)}
                cy={y(v)}
                r={i === ativo ? 4.5 : 2.5}
                fill={s.tracejada ? 'rgb(var(--c-surface))' : s.cor}
                stroke={s.cor}
                strokeWidth="1.5"
              />
            ) : null,
          ),
        )}

        {meses.map((mes, i) => {
          const ehUltimo = i === n - 1
          if (!ehUltimo && (i % passoX !== 0 || n - 1 - i < Math.ceil(passoX / 2))) return null
          const anchor = i === 0 ? 'start' : ehUltimo ? 'end' : 'middle'
          return (
            <text key={`r-${mes}`} x={x(i)} y={H - 8} textAnchor={anchor} className="fill-muted" style={{ fontSize: 9 }}>
              {rotuloMes(mes)}
            </text>
          )
        })}
      </svg>
      {tip.tooltip}
    </div>
  )
}

/** Caminho com QUEBRAS nos meses sem fonte: null reinicia o traço (M) em vez de ligar. */
function tracoComQuebras(valores: readonly (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = ''
  let caneta = false
  valores.forEach((v, i) => {
    if (v === null) {
      caneta = false
      return
    }
    d += `${caneta ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    caneta = true
  })
  return d
}
