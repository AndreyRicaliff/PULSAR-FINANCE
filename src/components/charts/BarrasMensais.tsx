/**
 * @file Barras mensais entrada×saída DIVERGENTES — entradas sobem, saídas descem do eixo
 * zero (saída é negativo; empilhar tudo pra cima escondia o sinal) — com uma polyline
 * tracejada ligando os vértices de cada série (a "linha de oscilação" pedida em 02/08).
 * SVG único (as polylines exigem geometria compartilhada); médias ficam na legenda.
 * Mesma escala nos dois lados — comparação honesta (um eixo só).
 */
import { useState } from 'react'
import type { BarraMes } from '@/lib/graficos'
import { brl, fracVariacao, pctVariacao } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'

const BAR_W = 12
const GAP = 12
const PASSO = BAR_W + GAP
const PAD_L = 8
const PAD_R = 8
const PAD_T = 6
const H_LADO = 84 // altura útil de cada lado do eixo
const RODAPE = 18
const BASE_Y = PAD_T + H_LADO
const H = BASE_Y + H_LADO + RODAPE

export function BarrasMensais({ dados }: { dados: readonly BarraMes[] }) {
  const tip = useTooltipGrafico()
  const [ativo, setAtivo] = useState<number | null>(null)
  if (dados.length === 0) return <p className="text-sm text-muted">Sem movimentação datada.</p>
  const max = Math.max(1, ...dados.flatMap((d) => [d.entrada, d.saida]))
  const mediaEntrada = dados.reduce((s, d) => s + d.entrada, 0) / dados.length
  const mediaSaida = dados.reduce((s, d) => s + d.saida, 0) / dados.length
  const largura = PAD_L + dados.length * PASSO - GAP + PAD_R
  const xCentro = (i: number) => PAD_L + i * PASSO + BAR_W / 2
  const hDe = (v: number) => (v / max) * H_LADO

  const vertEntradas = dados.map((d, i) => `${xCentro(i).toFixed(1)},${(BASE_Y - hDe(d.entrada)).toFixed(1)}`).join(' ')
  const vertSaidas = dados.map((d, i) => `${xCentro(i).toFixed(1)},${(BASE_Y + hDe(d.saida)).toFixed(1)}`).join(' ')

  return (
    <div className="flex flex-col gap-3">
      <Legenda mediaEntrada={mediaEntrada} mediaSaida={mediaSaida} />
      <div className="pb-1">
        {/* Sem width fixo: o viewBox escala com o container — no modal expandido o gráfico
            cresce junto em vez de boiar pequeno num mar de espaço (report 02/08). */}
        <svg viewBox={`0 0 ${largura} ${H}`} className="block h-auto w-full" onMouseLeave={() => { setAtivo(null); tip.esconder() }}>
          <defs>
            <linearGradient id="bm-ent" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="rgb(var(--c-accent))" />
            </linearGradient>
            <linearGradient id="bm-sai" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-danger))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="rgb(var(--c-danger))" />
            </linearGradient>
          </defs>

          {dados.map((d, i) => {
            const x = PAD_L + i * PASSO
            const hE = hDe(d.entrada)
            const hS = hDe(d.saida)
            const opaco = ativo === null || ativo === i ? 1 : 0.45
            // Rótulo esparso: '01/25' é mais largo que o passo — imprimir todos vira mancha
            // ilegível (report 02/08). O tooltip nomeia qualquer mês no hover.
            const passoRot = Math.max(1, Math.ceil(dados.length / 14))
            const rotula = i === ativo || i === dados.length - 1 || (i % passoRot === 0 && dados.length - 1 - i >= Math.ceil(passoRot / 2))
            return (
              <g key={d.mes} style={{ opacity: opaco }} className="transition-opacity duration-200">
                {hE > 0 ? <rect x={x} y={BASE_Y - hE} width={BAR_W} height={hE} rx="2" fill="url(#bm-ent)" /> : null}
                {hS > 0 ? <rect x={x} y={BASE_Y} width={BAR_W} height={hS} rx="2" fill="url(#bm-sai)" /> : null}
                {rotula ? (
                  <text x={xCentro(i)} y={H - 5} textAnchor="middle" className="fill-muted tabular-nums" style={{ fontSize: 9, fontWeight: i === ativo ? 700 : 400 }}>
                    {d.mes}
                  </text>
                ) : null}
              </g>
            )
          })}

          {/* Eixo zero — a âncora de leitura do divergente. */}
          <line x1="0" y1={BASE_Y} x2={largura} y2={BASE_Y} stroke="rgb(var(--c-bd))" strokeWidth="1.25" />

          {/* Oscilação: polyline tracejada ligando os vértices de cada série. */}
          {dados.length > 1 ? (
            <>
              <polyline points={vertEntradas} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.85" strokeLinejoin="round" />
              <polyline points={vertSaidas} fill="none" stroke="rgb(var(--c-danger))" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.85" strokeLinejoin="round" />
            </>
          ) : null}

          {/* Camada de hover: uma faixa invisível por mês (alvo maior que a barra). */}
          {dados.map((d, i) => (
            <rect
              key={`h-${d.mes}`}
              x={PAD_L + i * PASSO - GAP / 2}
              y="0"
              width={PASSO}
              height={H}
              fill="transparent"
              onMouseMove={(e) => {
                setAtivo(i)
                const anterior = dados[i - 1]
                const saldo = d.entrada - d.saida
                tip.mostrar(
                  e,
                  <>
                    <TipTitulo>{d.mes}</TipTitulo>
                    <TipLinha rotulo="Entradas" valor={brl(d.entrada)} classe="text-accent" />
                    {anterior ? <TipLinha rotulo="· vs mês anterior" valor={pctVariacao(fracVariacao(d.entrada, anterior.entrada))} /> : null}
                    <TipLinha rotulo="Saídas" valor={brl(d.saida)} classe="text-danger" />
                    {anterior ? <TipLinha rotulo="· vs mês anterior" valor={pctVariacao(fracVariacao(d.saida, anterior.saida))} /> : null}
                    <TipLinha rotulo="Saldo" valor={brl(saldo)} classe={saldo < 0 ? 'text-danger' : 'text-accent'} />
                  </>,
                )
              }}
            />
          ))}
        </svg>
      </div>
      {tip.tooltip}
    </div>
  )
}

function Legenda({ mediaEntrada, mediaSaida }: { mediaEntrada: number; mediaSaida: number }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-accent" /> Entradas (acima do eixo)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-danger" /> Saídas (abaixo do eixo)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t border-dashed border-accent/70" /> oscilação · média {brl(mediaEntrada)}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t border-dashed border-danger/70" /> oscilação · média {brl(mediaSaida)}
      </span>
    </div>
  )
}
