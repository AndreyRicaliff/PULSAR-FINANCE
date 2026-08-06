/**
 * @file Linha do tempo mensal com trecho projetado tracejado (projeção ≠ dado real).
 * Eixo Y com valores e gridlines (report 2026-08-02: sem números não dava pra ler a
 * escala), zero em destaque quando a série cruza o sinal, máx/mín rotulados
 * seletivamente (nunca número em todo ponto). Tooltip por proximidade no eixo X.
 */
import { useState, type MouseEvent } from 'react'
import { brlCompacto, ticksDoEixo } from '@/core/eixo'
import { AREA_OPACIDADE, CROSSHAIR, FONTE_GRAFICO, MAX_PONTOS_VISIVEIS, REFERENCIA } from '@/core/graficoTema'
import { useEscalaGrafico } from '@/lib/escalaGrafico'
import { brl, fracVariacao, pctVariacao } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'
import { useLarguraGrafico } from '@/lib/useLarguraGrafico'

export interface PontoTempo {
  readonly rotulo: string
  readonly valor: number
  readonly projetado: boolean
}

const H_BASE = 220
const PAD_E = 56 // esquerda: espaço dos rótulos do eixo Y
const PAD_D = 16
const PAD_V = 28

export function LinhaTempo({ pontos, cor = 'rgb(var(--c-accent))' }: { pontos: readonly PontoTempo[]; cor?: string }) {
  const tip = useTooltipGrafico(cor)
  const [ativo, setAtivo] = useState<number | null>(null)
  // Largura MEDIDA como largura do viewBox (report 03/08): escala 1:1, sem letterbox
  // nem explosão; altura amplia via fator do modal e o desenho se recalcula.
  const { ref, largura: W } = useLarguraGrafico()
  const H = Math.round(H_BASE * useEscalaGrafico())
  if (pontos.length < 2) {
    return <p className="text-sm text-muted">Poucos meses no período — amplie o intervalo para ver a evolução.</p>
  }
  const vals = pontos.map((p) => p.valor)
  const max = Math.max(0, ...vals)
  const min = Math.min(0, ...vals)
  const span = max - min || 1
  const x = (i: number) => PAD_E + (i / (pontos.length - 1)) * (W - PAD_E - PAD_D)
  const y = (v: number) => H - PAD_V - ((v - min) / span) * (H - 2 * PAD_V)

  const ticks = ticksDoEixo(min, max) // núcleo puro testado (core/eixo)

  const corte = pontos.findIndex((p) => p.projetado)
  const fimHist = corte === -1 ? pontos.length - 1 : corte - 1
  const hist = pontos.slice(0, fimHist + 1)
  const media = hist.reduce((s, p) => s + p.valor, 0) / hist.length
  const histD = traco(hist, 0, x, y)
  const projPts = corte === -1 ? [] : pontos.slice(fimHist, pontos.length)
  const projD = projPts.length > 1 ? traco(projPts, fimHist, x, y) : ''
  const areaD = `${histD} L${x(fimHist).toFixed(1)},${y(0).toFixed(1)} L${PAD_E},${y(0).toFixed(1)} Z`

  // Rótulos seletivos: máx e mín do HISTÓRICO (não todo ponto — vira ruído).
  const iMax = hist.reduce((m, p, i) => (p.valor > hist[m]!.valor ? i : m), 0)
  const iMin = hist.reduce((m, p, i) => (p.valor < hist[m]!.valor ? i : m), 0)
  const extremos = new Set(hist.length > 4 && iMax !== iMin ? [iMax, iMin] : [])

  function aoMover(e: MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const xvb = ((e.clientX - r.left) / r.width) * W
    const i = Math.min(pontos.length - 1, Math.max(0, Math.round(((xvb - PAD_E) / (W - PAD_E - PAD_D)) * (pontos.length - 1))))
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
  const cruzaZero = min < 0 && max > 0

  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block" onMouseMove={aoMover} onMouseLeave={aoSair}>
        <defs>
          <linearGradient id="lt-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity={AREA_OPACIDADE.topo} />
            <stop offset="100%" stopColor={cor} stopOpacity={AREA_OPACIDADE.base} />
          </linearGradient>
        </defs>

        {/* Grid horizontal recessivo + valores do eixo Y (o pedido do círculo azul). */}
        {ticks.map((t) => (
          <g key={`t-${t}`}>
            <line x1={PAD_E} y1={y(t)} x2={W - PAD_D} y2={y(t)} stroke="rgb(var(--c-bd))" strokeWidth="0.5" strokeOpacity={t === 0 ? 0 : 0.55} />
            <text x={PAD_E - 6} y={y(t) + 3.5} textAnchor="end" className="fill-muted tabular-nums" style={{ fontSize: FONTE_GRAFICO.eixoY }}>
              {brlCompacto(t)}
            </text>
          </g>
        ))}

        {/* Zero em destaque quando a série cruza o sinal — é a âncora de leitura. */}
        <line x1={PAD_E} y1={y(0)} x2={W - PAD_D} y2={y(0)} stroke="rgb(var(--c-bd))" strokeWidth={cruzaZero ? 1.5 : 1} strokeOpacity={cruzaZero ? 0.9 : 0.7} />

        {/* Linha de referência: média do HISTÓRICO (projeção não entra na média). */}
        <line x1={PAD_E} y1={y(media)} x2={W - PAD_D} y2={y(media)} stroke="rgb(var(--c-warn))" strokeWidth={REFERENCIA.largura} strokeDasharray={REFERENCIA.traco} strokeOpacity="0.8" />
        <text x={W - PAD_D} y={y(media) - 5} textAnchor="end" className="fill-warn" style={{ fontSize: FONTE_GRAFICO.nota }}>
          média {brlCompacto(media)}
        </text>

        <path d={areaD} fill="url(#lt-grad)" className="anim-area-fade" />
        <path d={histD} fill="none" stroke={cor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1000} className="anim-draw-line" />
        {projD ? (
          <path d={projD} fill="none" stroke={cor} strokeWidth="2.5" strokeDasharray="6 5" strokeOpacity="0.7" pathLength={1000} className="anim-draw-line" style={{ animationDelay: '0.1s' }} />
        ) : null}
        {/* Mira cinza tracejada, nunca na cor da série: a linha é o dado, a mira é ferramenta. */}
        {ativo !== null ? (
          <line
            x1={x(ativo)}
            y1={PAD_V / 2}
            x2={x(ativo)}
            y2={H - PAD_V}
            stroke="rgb(var(--c-muted))"
            strokeWidth={CROSSHAIR.largura}
            strokeDasharray={CROSSHAIR.traco}
            strokeOpacity={CROSSHAIR.opacidade}
          />
        ) : null}

        {/* Acima do teto, ponto por marcação vira poeira — só o ativo permanece. */}
        {pontos.map((p, i) =>
          n > MAX_PONTOS_VISIVEIS && i !== ativo ? null : (
            <circle
              key={p.rotulo}
              cx={x(i)}
              cy={y(p.valor)}
              r={i === ativo ? 5 : p.projetado ? 3 : 3.5}
              fill={p.projetado ? 'rgb(var(--c-surface))' : cor}
              stroke={i === ativo ? 'rgb(var(--c-surface))' : cor}
              strokeWidth="2"
              className="anim-dot-pop"
              style={{ animationDelay: `${(i / (n - 1)) * 0.8}s` }}
            />
          ),
        )}

        {/* Rótulos seletivos de valor: só máx e mín do histórico. */}
        {[...extremos].map((i) => (
          <text
            key={`e-${i}`}
            x={x(i)}
            y={y(hist[i]!.valor) + (i === iMin ? 14 : -8)}
            textAnchor="middle"
            className="fill-muted tabular-nums"
            style={{ fontSize: FONTE_GRAFICO.nota, fontWeight: 600 }}
          >
            {brlCompacto(hist[i]!.valor)}
          </text>
        ))}

        {/* Rótulos do eixo X esparsos e adaptativos à largura real; some o penúltimo se
            colar no último (evita "12/27/28"). */}
        {pontos.map((p, i) => {
          const passoX = Math.max(1, Math.ceil((56 * (n - 1)) / Math.max(1, W - PAD_E - PAD_D)))
          const ehUltimo = i === n - 1
          if (!ehUltimo && (i % passoX !== 0 || n - 1 - i < Math.ceil(passoX / 2))) return null
          const anchor = i === 0 ? 'start' : ehUltimo ? 'end' : 'middle'
          return (
            <text key={`r-${p.rotulo}`} x={x(i)} y={H - 8} textAnchor={anchor} className="fill-muted" style={{ fontSize: FONTE_GRAFICO.eixoX }}>
              {p.rotulo}
            </text>
          )
        })}
      </svg>
      {tip.tooltip}
    </div>
  )
}

function traco(
  pts: readonly PontoTempo[],
  offset: number,
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${x(offset + i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
}
