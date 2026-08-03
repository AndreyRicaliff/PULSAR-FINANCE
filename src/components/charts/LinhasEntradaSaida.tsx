/**
 * @file Duas linhas mensais (entradas × saídas) — a oscilação de uma lista recortada
 * (pedida 02/08 para os Movimentos Neutros). Mesma âncora de leitura do LinhaTempo:
 * eixo Y com valores e gridlines recessivas, tooltip por proximidade no eixo X.
 * Valores sempre ≥ 0 (magnitudes) — o confronto entre as linhas é a leitura.
 */
import { useState, type MouseEvent } from 'react'
import { brlCompacto, ticksDoEixo } from '@/core/eixo'
import { useEscalaGrafico } from '@/lib/escalaGrafico'
import type { BarraMes } from '@/lib/graficos'
import { brl } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'
import { useLarguraGrafico } from '@/lib/useLarguraGrafico'

const H_BASE = 220
const PAD_E = 56
const PAD_D = 16
const PAD_V = 28

export function LinhasEntradaSaida({ dados }: { dados: readonly BarraMes[] }) {
  const tip = useTooltipGrafico()
  const [ativo, setAtivo] = useState<number | null>(null)
  // Largura MEDIDA como largura do viewBox (report 03/08): escala 1:1, sem letterbox
  // nem explosão; altura amplia via fator do modal e o desenho se recalcula.
  const { ref, largura: W } = useLarguraGrafico()
  const H = Math.round(H_BASE * useEscalaGrafico())
  if (dados.length < 2) {
    return <p className="text-sm text-muted">Poucos meses no período — amplie o intervalo para ver a oscilação.</p>
  }
  const n = dados.length
  const max = Math.max(1, ...dados.flatMap((d) => [d.entrada, d.saida]))
  const x = (i: number) => PAD_E + (i / (n - 1)) * (W - PAD_E - PAD_D)
  const y = (v: number) => H - PAD_V - (v / max) * (H - 2 * PAD_V)
  const ticks = ticksDoEixo(0, max)
  const traco = (de: (d: BarraMes) => number) =>
    dados.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(de(d)).toFixed(1)}`).join(' ')

  function aoMover(e: MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const xvb = ((e.clientX - r.left) / r.width) * W
    const i = Math.min(n - 1, Math.max(0, Math.round(((xvb - PAD_E) / (W - PAD_E - PAD_D)) * (n - 1))))
    const d = dados[i]!
    const saldo = d.entrada - d.saida
    setAtivo(i)
    tip.mostrar(
      e,
      <>
        <TipTitulo>{d.mes}</TipTitulo>
        <TipLinha rotulo="Entradas" valor={brl(d.entrada)} classe="text-accent" />
        <TipLinha rotulo="Saídas" valor={brl(d.saida)} classe="text-danger" />
        <TipLinha rotulo="Saldo" valor={brl(saldo)} classe={saldo < 0 ? 'text-danger' : 'text-accent'} />
      </>,
    )
  }

  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-accent" /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-danger" /> Saídas
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="block"
        onMouseMove={aoMover}
        onMouseLeave={() => {
          setAtivo(null)
          tip.esconder()
        }}
      >
        {ticks.map((t) => (
          <g key={`t-${t}`}>
            <line x1={PAD_E} y1={y(t)} x2={W - PAD_D} y2={y(t)} stroke="rgb(var(--c-bd))" strokeWidth="0.5" strokeOpacity={t === 0 ? 0.9 : 0.55} />
            <text x={PAD_E - 6} y={y(t) + 3} textAnchor="end" className="fill-muted tabular-nums" style={{ fontSize: 8.5 }}>
              {brlCompacto(t)}
            </text>
          </g>
        ))}

        {ativo !== null ? <line x1={x(ativo)} y1={PAD_V / 2} x2={x(ativo)} y2={H - PAD_V} stroke="rgb(var(--c-muted))" strokeWidth="1" strokeOpacity="0.35" /> : null}

        <path d={traco((d) => d.entrada)} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={traco((d) => d.saida)} fill="none" stroke="rgb(var(--c-danger))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {dados.map((d, i) => (
          <g key={d.mes}>
            <circle cx={x(i)} cy={y(d.entrada)} r={i === ativo ? 4.5 : 3} fill="rgb(var(--c-accent))" />
            <circle cx={x(i)} cy={y(d.saida)} r={i === ativo ? 4.5 : 3} fill="rgb(var(--c-danger))" />
          </g>
        ))}

        {dados.map((d, i) => {
          const passoX = Math.max(1, Math.ceil((56 * (n - 1)) / Math.max(1, W - PAD_E - PAD_D)))
          const ehUltimo = i === n - 1
          if (!ehUltimo && (i % passoX !== 0 || n - 1 - i < Math.ceil(passoX / 2))) return null
          const anchor = i === 0 ? 'start' : ehUltimo ? 'end' : 'middle'
          return (
            <text key={`r-${d.mes}`} x={x(i)} y={H - 8} textAnchor={anchor} className="fill-muted" style={{ fontSize: 9 }}>
              {d.mes}
            </text>
          )
        })}
      </svg>
      {tip.tooltip}
    </div>
  )
}
