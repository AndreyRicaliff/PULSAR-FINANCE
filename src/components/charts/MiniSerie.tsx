/**
 * @file Mini-gráfico de série mensal para os cards de indicador: linha + área, tooltip rico por
 * proximidade no eixo X (mês, valor, Δ vs mês anterior e vs média), linha de média tracejada e
 * rótulos de mês no eixo. Mostra o PERÍODO — não é só sparkline. SVG puro, tokens AG.
 */
import { useState, type MouseEvent } from 'react'
import { fmtIndicador, type PontoIndicador } from '@/lib/indicadores'
import { fracVariacao, pctVariacao } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'

const W = 240
const H = 64
const PADX = 6
const PADTOP = 8
const PADBOT = 16

const fmt = (p: PontoIndicador): string => fmtIndicador(p.valor, p.percentual)

export function MiniSerie({ pontos, cor }: { pontos: readonly PontoIndicador[]; cor: string }) {
  const tip = useTooltipGrafico(cor)
  const [ativo, setAtivo] = useState<number | null>(null)
  if (pontos.length < 2) return null
  const vals = pontos.map((p) => p.valor)
  const max = Math.max(0, ...vals)
  const min = Math.min(0, ...vals)
  const span = max - min || 1
  const media = vals.reduce((s, v) => s + v, 0) / vals.length
  const x = (i: number) => PADX + (i / (pontos.length - 1)) * (W - 2 * PADX)
  const y = (v: number) => PADTOP + (1 - (v - min) / span) * (H - PADTOP - PADBOT)
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const area = `${linha} L${x(pontos.length - 1).toFixed(1)},${y(min)} L${x(0).toFixed(1)},${y(min)} Z`
  const rotulos = indicesRotulo(pontos.length)
  const id = `ms-${cor.replace(/[^a-z]/gi, '')}`

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
        <TipLinha rotulo="Valor" valor={fmt(p)} />
        {ant ? <TipLinha rotulo="vs mês anterior" valor={pctVariacao(fracVariacao(p.valor, ant.valor))} /> : null}
        <TipLinha rotulo="Média do período" valor={fmt({ rotulo: '', valor: media, percentual: p.percentual })} />
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
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-16 w-full" onMouseMove={aoMover} onMouseLeave={aoSair}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {min < 0 && max > 0 ? (
          <line x1={PADX} y1={y(0)} x2={W - PADX} y2={y(0)} stroke="rgb(var(--c-bd))" strokeWidth="0.5" />
        ) : null}
        <line x1={PADX} y1={y(media)} x2={W - PADX} y2={y(media)} stroke="rgb(var(--c-warn))" strokeWidth="0.75" strokeDasharray="3 3" strokeOpacity="0.75" />
        <path d={area} fill={`url(#${id})`} className="anim-area-fade" />
        <path
          d={linha}
          fill="none"
          stroke={cor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1000}
          className="anim-draw-line"
        />
        {pontos.map((p, i) => (
          <circle
            key={p.rotulo}
            cx={x(i)}
            cy={y(p.valor)}
            r={i === ativo ? 3 : 2}
            fill={cor}
            className="anim-dot-pop"
            style={{ animationDelay: `${(i / (n - 1)) * 0.8}s` }}
          />
        ))}
        {rotulos.map((i) => (
          <text
            key={pontos[i]!.rotulo}
            x={x(i)}
            y={H - 4}
            textAnchor={i === 0 ? 'start' : i === pontos.length - 1 ? 'end' : 'middle'}
            className="fill-muted"
            style={{ fontSize: 7 }}
          >
            {pontos[i]!.rotulo}
          </text>
        ))}
      </svg>
      {tip.tooltip}
    </>
  )
}

/** 1º, meio e último — mas sem repetir índice quando a série é curta. */
function indicesRotulo(n: number): number[] {
  if (n <= 2) return [0, n - 1]
  return [...new Set([0, Math.floor((n - 1) / 2), n - 1])]
}
