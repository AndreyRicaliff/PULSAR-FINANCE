/**
 * @file Barras mensais entrada×saída DIVERGENTES — entradas sobem, saídas descem do eixo
 * zero (saída é negativo; empilhar tudo pra cima escondia o sinal) — com uma polyline
 * tracejada ligando os vértices de cada série (a "linha de oscilação" pedida em 02/08).
 * SVG único (as polylines exigem geometria compartilhada); médias ficam na legenda.
 * Mesma escala nos dois lados — comparação honesta (um eixo só).
 *
 * Geometria por LARGURA MEDIDA (report 03/08): o viewBox tem a largura real do container
 * (escala 1:1, nunca explode nem letterboxa) e as barras se distribuem pra preencher.
 */
import { useState } from 'react'
import type { BarraMes } from '@/lib/graficos'
import { useEscalaGrafico } from '@/lib/escalaGrafico'
import { brl, fracVariacao, pctVariacao } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'
import { useLarguraGrafico } from '@/lib/useLarguraGrafico'

const BAR_W_MIN = 8
const BAR_W_MAX = 44
const PASSO_MIN = BAR_W_MIN + 8
const PAD_L = 8
const PAD_R = 8
const PAD_T = 6
const H_LADO_BASE = 84 // altura útil de cada lado do eixo (card; o modal amplia via fator)
const RODAPE = 18

export function BarrasMensais({ dados }: { dados: readonly BarraMes[] }) {
  const tip = useTooltipGrafico()
  const [ativo, setAtivo] = useState<number | null>(null)
  const { ref, largura } = useLarguraGrafico()
  const fator = useEscalaGrafico()
  if (dados.length === 0) return <p className="text-sm text-muted">Sem movimentação datada.</p>

  const n = dados.length
  const hLado = Math.round(H_LADO_BASE * fator)
  const baseY = PAD_T + hLado
  const alto = baseY + hLado + RODAPE

  // Passo = fatia da largura real por mês (clampado por baixo); barra centrada no passo.
  const PASSO = Math.max(PASSO_MIN, (largura - PAD_L - PAD_R) / n)
  const viewW = Math.max(largura, Math.ceil(PAD_L + n * PASSO + PAD_R))
  const BAR_W = Math.min(BAR_W_MAX, Math.max(BAR_W_MIN, Math.round(PASSO * 0.45)))
  const xSlot = (i: number) => PAD_L + i * PASSO
  const xBarra = (i: number) => xSlot(i) + (PASSO - BAR_W) / 2
  const xCentro = (i: number) => xSlot(i) + PASSO / 2

  const max = Math.max(1, ...dados.flatMap((d) => [d.entrada, d.saida]))
  const mediaEntrada = dados.reduce((s, d) => s + d.entrada, 0) / n
  const mediaSaida = dados.reduce((s, d) => s + d.saida, 0) / n
  const hDe = (v: number) => (v / max) * hLado

  const vertEntradas = dados.map((d, i) => `${xCentro(i).toFixed(1)},${(baseY - hDe(d.entrada)).toFixed(1)}`).join(' ')
  const vertSaidas = dados.map((d, i) => `${xCentro(i).toFixed(1)},${(baseY + hDe(d.saida)).toFixed(1)}`).join(' ')

  // Rótulo esparso adaptativo: quantos '01/25' (~44px) cabem no passo real.
  const passoRot = Math.max(1, Math.ceil(44 / PASSO))

  return (
    <div className="flex flex-col gap-3">
      <Legenda mediaEntrada={mediaEntrada} mediaSaida={mediaSaida} />
      <div ref={ref} className="w-full overflow-x-auto pb-1">
        {/* viewBox de largura MEDIDA + altura fixa: aspecto do box == aspecto do desenho,
            o `meet` não tem o que explodir nem letterboxar (report 03/08). Quando o passo
            satura em PASSO_MIN (muitos meses num card estreito) o desenho TRANSBORDA em
            scroll horizontal em vez de encolher — width=100% aqui re-letterboxaria. */}
        <svg
          viewBox={`0 0 ${viewW} ${alto}`}
          width={viewW > largura ? viewW : '100%'}
          height={alto}
          preserveAspectRatio="xMidYMid meet"
          className="block"
          onMouseLeave={() => { setAtivo(null); tip.esconder() }}
        >
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
            const x = xBarra(i)
            const hE = hDe(d.entrada)
            const hS = hDe(d.saida)
            const opaco = ativo === null || ativo === i ? 1 : 0.45
            // Tooltip nomeia qualquer mês no hover; imprimir todos vira mancha (report 02/08).
            const rotula = i === ativo || i === n - 1 || (i % passoRot === 0 && n - 1 - i >= Math.ceil(passoRot / 2))
            return (
              <g key={d.mes} style={{ opacity: opaco }} className="transition-opacity duration-200">
                {hE > 0 ? <rect x={x} y={baseY - hE} width={BAR_W} height={hE} rx="2" fill="url(#bm-ent)" /> : null}
                {hS > 0 ? <rect x={x} y={baseY} width={BAR_W} height={hS} rx="2" fill="url(#bm-sai)" /> : null}
                {rotula ? (
                  <text x={xCentro(i)} y={alto - 5} textAnchor="middle" className="fill-muted tabular-nums" style={{ fontSize: 9, fontWeight: i === ativo ? 700 : 400 }}>
                    {d.mes}
                  </text>
                ) : null}
              </g>
            )
          })}

          {/* Eixo zero — a âncora de leitura do divergente. */}
          <line x1="0" y1={baseY} x2={viewW} y2={baseY} stroke="rgb(var(--c-bd))" strokeWidth="1.25" />

          {/* Oscilação: polyline tracejada ligando os vértices de cada série. */}
          {n > 1 ? (
            <>
              <polyline points={vertEntradas} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.85" strokeLinejoin="round" />
              <polyline points={vertSaidas} fill="none" stroke="rgb(var(--c-danger))" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.85" strokeLinejoin="round" />
            </>
          ) : null}

          {/* Camada de hover: uma faixa invisível por mês (alvo maior que a barra). */}
          {dados.map((d, i) => (
            <rect
              key={`h-${d.mes}`}
              x={xSlot(i)}
              y="0"
              width={PASSO}
              height={alto}
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
