/** @file Série mensal ampliada do indicador (modal de análise): linha + área, média tracejada, rótulos e tooltip rico. */
import { useState, type MouseEvent } from 'react'
import { fmtIndicador, type PontoIndicador } from '@/lib/indicadores'
import { fracVariacao, pctVariacao } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'

const W = 640
const H = 260
const PADX = 18
const PADTOP = 14
const PADBOT = 26

export function SerieIndicador({ pontos, cor }: { pontos: readonly PontoIndicador[]; cor: string }) {
  const tip = useTooltipGrafico(cor)
  const [ativo, setAtivo] = useState<number | null>(null)
  if (pontos.length < 2) return null
  const vals = pontos.map((p) => p.valor)
  const max = Math.max(0, ...vals)
  const min = Math.min(0, ...vals)
  const span = max - min || 1
  const media = vals.reduce((s, v) => s + v, 0) / vals.length
  const percentual = pontos[0]!.percentual
  const x = (i: number) => PADX + (i / (pontos.length - 1)) * (W - 2 * PADX)
  const y = (v: number) => PADTOP + (1 - (v - min) / span) * (H - PADTOP - PADBOT)
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const area = `${linha} L${x(pontos.length - 1).toFixed(1)},${y(min)} L${x(0).toFixed(1)},${y(min)} Z`
  const passo = Math.max(1, Math.ceil(pontos.length / 12))

  function aoMover(e: MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const xvb = ((e.clientX - r.left) / r.width) * W
    const i = Math.min(pontos.length - 1, Math.max(0, Math.round(((xvb - PADX) / (W - 2 * PADX)) * (pontos.length - 1))))
    const p = pontos[i]!
    const ant = i > 0 ? pontos[i - 1] : undefined
    setAtivo(i)
    tip.mostrar(
      e,
      <>
        <TipTitulo>{p.rotulo}</TipTitulo>
        <TipLinha rotulo="Valor" valor={fmtIndicador(p.valor, percentual)} />
        {ant ? <TipLinha rotulo="vs mês anterior" valor={pctVariacao(fracVariacao(p.valor, ant.valor))} /> : null}
        <TipLinha rotulo="vs média do período" valor={pctVariacao(fracVariacao(p.valor, media))} />
      </>,
    )
  }
  function aoSair() {
    setAtivo(null)
    tip.esconder()
  }

  const n = pontos.length

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full" onMouseMove={aoMover} onMouseLeave={aoSair}>
        <defs>
          <linearGradient id="si-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {min < 0 && max > 0 ? (
          <line x1={PADX} y1={y(0)} x2={W - PADX} y2={y(0)} stroke="rgb(var(--c-bd))" strokeWidth="1" />
        ) : null}
        <line x1={PADX} y1={y(media)} x2={W - PADX} y2={y(media)} stroke="rgb(var(--c-warn))" strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.8" />
        <text x={W - PADX} y={y(media) - 5} textAnchor="end" className="fill-warn" style={{ fontSize: 9 }}>
          média {fmtIndicador(media, percentual)}
        </text>
        <path d={area} fill="url(#si-grad)" className="anim-area-fade" />
        <path
          d={linha}
          fill="none"
          stroke={cor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1000}
          className="anim-draw-line"
        />
        {ativo !== null ? (
          <line x1={x(ativo)} y1={PADTOP} x2={x(ativo)} y2={H - PADBOT} stroke={cor} strokeWidth="1" strokeOpacity="0.35" />
        ) : null}
        {pontos.map((p, i) => (
          <circle
            key={p.rotulo}
            cx={x(i)}
            cy={y(p.valor)}
            r={i === ativo ? 5 : 3}
            fill={cor}
            className="anim-dot-pop"
            style={{ animationDelay: `${(i / (n - 1)) * 0.8}s` }}
          />
        ))}
        {pontos.map((p, i) =>
          i % passo === 0 || i === pontos.length - 1 ? (
            <text
              key={`r-${p.rotulo}`}
              x={x(i)}
              y={H - 8}
              textAnchor={i === 0 ? 'start' : i === pontos.length - 1 ? 'end' : 'middle'}
              className="fill-muted"
              style={{ fontSize: 9 }}
            >
              {p.rotulo}
            </text>
          ) : null,
        )}
      </svg>
      {tip.tooltip}
    </>
  )
}
