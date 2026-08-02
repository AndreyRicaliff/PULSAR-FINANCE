/**
 * @file Evolução mensal do CAPEX — colunas EMPILHADAS investimento (base, verde) +
 * manutenção (topo, âmbar): a altura é o CAPEX do mês, a divisão é a composição.
 * Âmbar (não vermelho) de propósito: manutenção não é "ruim", é natureza diferente.
 * Mês negativo (estorno/devolução maior que o pago) não empilha — vira marcador no
 * eixo com o valor real no tooltip.
 */
import { useState } from 'react'
import type { CapexMes } from '@/core/capex'
import { brl } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'

const BAR_W = 16
const GAP = 12
const PASSO = BAR_W + GAP
const PAD_L = 8
const PAD_R = 8
const PAD_T = 6
const H_UTIL = 150
const RODAPE = 18
const BASE_Y = PAD_T + H_UTIL
const H = BASE_Y + RODAPE

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`

export function BarrasCapexMensal({ dados }: { dados: readonly CapexMes[] }) {
  const tip = useTooltipGrafico()
  const [ativo, setAtivo] = useState<number | null>(null)
  if (dados.length === 0) return <p className="text-sm text-muted">Sem baixa de CAPEX no período.</p>
  const totalMes = (d: CapexMes) => Math.max(0, d.investimentoCentavos) + Math.max(0, d.manutencaoCentavos)
  const max = Math.max(1, ...dados.map(totalMes))
  const largura = PAD_L + dados.length * PASSO - GAP + PAD_R
  const h = (v: number) => (Math.max(0, v) / max) * H_UTIL

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-accent" /> Investimento (expansão)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-warn" /> Manutenção (reposição/reparos)
        </span>
      </div>
      <div className="overflow-x-auto pb-1">
        <svg width={largura} height={H} viewBox={`0 0 ${largura} ${H}`} className="block" onMouseLeave={() => { setAtivo(null); tip.esconder() }}>
          {dados.map((d, i) => {
            const x = PAD_L + i * PASSO
            const hInv = h(d.investimentoCentavos)
            const hMan = h(d.manutencaoCentavos)
            const opaco = ativo === null || ativo === i ? 1 : 0.45
            return (
              <g key={d.mes} style={{ opacity: opaco }} className="transition-opacity duration-200">
                {hInv > 0 ? <rect x={x} y={BASE_Y - hInv} width={BAR_W} height={hInv} fill="rgb(var(--c-accent))" /> : null}
                {hMan > 0 ? <rect x={x} y={BASE_Y - hInv - hMan} width={BAR_W} height={hMan} rx="2" fill="rgb(var(--c-warn))" /> : null}
                {hInv === 0 && hMan === 0 ? (
                  <rect x={x} y={BASE_Y - 2} width={BAR_W} height="2" fill="rgb(var(--c-muted))" opacity="0.6" />
                ) : null}
                <text x={x + BAR_W / 2} y={H - 5} textAnchor="middle" className="fill-muted tabular-nums" style={{ fontSize: 9 }}>
                  {rotuloMes(d.mes)}
                </text>
              </g>
            )
          })}
          <line x1="0" y1={BASE_Y} x2={largura} y2={BASE_Y} stroke="rgb(var(--c-bd))" strokeWidth="1.25" />
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
                const total = d.investimentoCentavos + d.manutencaoCentavos
                const pctInv = total !== 0 ? Math.round((d.investimentoCentavos / total) * 100) : null
                tip.mostrar(
                  e,
                  <>
                    <TipTitulo>{rotuloMes(d.mes)}</TipTitulo>
                    <TipLinha rotulo="Investimento" valor={brl(d.investimentoCentavos)} classe="text-accent" />
                    <TipLinha rotulo="Manutenção" valor={brl(d.manutencaoCentavos)} classe="text-warn" />
                    <TipLinha rotulo="Total do mês" valor={brl(total)} />
                    {pctInv !== null ? <TipLinha rotulo="Composição" valor={`${pctInv}% inv · ${100 - pctInv}% man`} /> : null}
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
