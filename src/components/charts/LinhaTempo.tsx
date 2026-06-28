/** @file Linha do tempo mensal com trecho projetado tracejado (projeção ≠ dado real). Tooltip por proximidade no eixo X. */
import { useState, type MouseEvent } from 'react'
import { brl, fracVariacao, pctVariacao } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'

export interface PontoTempo {
  readonly rotulo: string
  readonly valor: number
  readonly projetado: boolean
}

const W = 600
const H = 220
const PAD = 28

export function LinhaTempo({ pontos, cor = 'rgb(var(--c-accent))' }: { pontos: readonly PontoTempo[]; cor?: string }) {
  const tip = useTooltipGrafico(cor)
  const [ativo, setAtivo] = useState<number | null>(null)
  if (pontos.length < 2) {
    return <p className="text-sm text-muted">Poucos meses no período — amplie o intervalo para ver a evolução.</p>
  }
  const vals = pontos.map((p) => p.valor)
  const max = Math.max(0, ...vals)
  const min = Math.min(0, ...vals)
  const span = max - min || 1
  const x = (i: number) => PAD + (i / (pontos.length - 1)) * (W - 2 * PAD)
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD)

  const corte = pontos.findIndex((p) => p.projetado)
  const fimHist = corte === -1 ? pontos.length - 1 : corte - 1
  const hist = pontos.slice(0, fimHist + 1)
  const media = hist.reduce((s, p) => s + p.valor, 0) / hist.length
  const histD = traco(hist, 0, x, y)
  const projPts = corte === -1 ? [] : pontos.slice(fimHist, corte + projLen(pontos, corte))
  const projD = projPts.length > 1 ? traco(projPts, fimHist, x, y) : ''
  const areaD = `${histD} L${x(fimHist).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`

  // Ponto mais próximo do cursor no eixo X — alvo de hover generoso (não exige acertar o círculo).
  function aoMover(e: MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const xvb = ((e.clientX - r.left) / r.width) * W
    const i = Math.min(pontos.length - 1, Math.max(0, Math.round(((xvb - PAD) / (W - 2 * PAD)) * (pontos.length - 1))))
    const p = pontos[i]!
    const ant = i > 0 ? pontos[i - 1] : undefined
    setAtivo(i)
    tip.mostrar(
      e,
      <>
        <TipTitulo>
          {p.rotulo}
          {p.projetado ? ' · projeção (estimativa)' : ''}
        </TipTitulo>
        <TipLinha rotulo="Valor" valor={brl(p.valor)} />
        {ant ? <TipLinha rotulo="vs mês anterior" valor={pctVariacao(fracVariacao(p.valor, ant.valor))} /> : null}
        <TipLinha rotulo="vs média histórica" valor={pctVariacao(fracVariacao(p.valor, media))} />
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
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" onMouseMove={aoMover} onMouseLeave={aoSair}>
        <defs>
          <linearGradient id="lt-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD} y1={y(0)} x2={W - PAD} y2={y(0)} stroke="rgb(var(--c-bd))" strokeWidth="1" />
        {/* Linha de referência: média do HISTÓRICO (projeção não entra na média). */}
        <line x1={PAD} y1={y(media)} x2={W - PAD} y2={y(media)} stroke="rgb(var(--c-warn))" strokeWidth="1" strokeDasharray="2 4" strokeOpacity="0.8" />
        <text x={W - PAD} y={y(media) - 4} textAnchor="end" className="fill-warn" style={{ fontSize: 8.5, opacity: 0.9 }}>
          média {brl(media)}
        </text>
        {/* Área entra com fade após o traço (delay 0.4s). */}
        <path d={areaD} fill="url(#lt-grad)" className="anim-area-fade" />
        {/* Traço se desenha da esquerda pra direita via pathLength+dashoffset. */}
        <path
          d={histD}
          fill="none"
          stroke={cor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1000}
          className="anim-draw-line"
        />
        {projD ? (
          <path
            d={projD}
            fill="none"
            stroke={cor}
            strokeWidth="2.5"
            strokeDasharray="6 5"
            strokeOpacity="0.7"
            pathLength={1000}
            className="anim-draw-line"
            style={{ animationDelay: '0.1s' }}
          />
        ) : null}
        {ativo !== null ? (
          <line x1={x(ativo)} y1={PAD / 2} x2={x(ativo)} y2={H - PAD} stroke={cor} strokeWidth="1" strokeOpacity="0.35" />
        ) : null}
        {/* Pontos surgem com stagger proporcional à posição no traço (após o traço passar). */}
        {pontos.map((p, i) => (
          <circle
            key={p.rotulo}
            cx={x(i)}
            cy={y(p.valor)}
            r={i === ativo ? 5 : p.projetado ? 3 : 3.5}
            fill={p.projetado ? 'rgb(var(--c-surface))' : cor}
            stroke={cor}
            strokeWidth="2"
            className="anim-dot-pop"
            style={{ animationDelay: `${(i / (n - 1)) * 0.8}s` }}
          />
        ))}
        {pontos.map((p, i) => (
          <text key={`r-${p.rotulo}`} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted" style={{ fontSize: 9 }}>
            {p.rotulo}
          </text>
        ))}
      </svg>
      {tip.tooltip}
    </>
  )
}

function projLen(pontos: readonly PontoTempo[], corte: number): number {
  return pontos.length - corte
}

function traco(
  pts: readonly PontoTempo[],
  offset: number,
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${x(offset + i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
}
