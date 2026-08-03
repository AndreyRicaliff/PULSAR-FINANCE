/**
 * @file Evolução mensal do CAPEX — colunas EMPILHADAS investimento (base, verde) +
 * manutenção (topo, âmbar): a altura é o CAPEX do mês, a divisão é a composição.
 * Âmbar (não vermelho) de propósito: manutenção não é "ruim", é natureza diferente.
 * Mês negativo (estorno/devolução maior que o pago) não empilha — vira marcador no
 * eixo com o valor real no tooltip.
 *
 * Geometria por LARGURA MEDIDA (report 03/08): o viewBox tem a largura real do container
 * (escala 1:1, nunca explode nem letterboxa) e as colunas se distribuem pra preencher.
 */
import { useState } from 'react'
import type { CapexMes } from '@/core/capex'
import { useEscalaGrafico } from '@/lib/escalaGrafico'
import { brl } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'
import { useLarguraGrafico } from '@/lib/useLarguraGrafico'

const BAR_W_MIN = 10
const BAR_W_MAX = 48
const PASSO_MIN = BAR_W_MIN + 8
const PAD_L = 8
const PAD_R = 8
const PAD_T = 6
const H_UTIL_BASE = 150 // altura útil no card; o modal amplia via fator
const RODAPE = 18

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`

export function BarrasCapexMensal({ dados }: { dados: readonly CapexMes[] }) {
  const tip = useTooltipGrafico()
  const [ativo, setAtivo] = useState<number | null>(null)
  const { ref, largura } = useLarguraGrafico()
  const fator = useEscalaGrafico()
  if (dados.length === 0) return <p className="text-sm text-muted">Sem baixa de CAPEX no período.</p>

  const n = dados.length
  const hUtil = Math.round(H_UTIL_BASE * fator)
  const baseY = PAD_T + hUtil
  const alto = baseY + RODAPE

  const PASSO = Math.max(PASSO_MIN, (largura - PAD_L - PAD_R) / n)
  const viewW = Math.max(largura, Math.ceil(PAD_L + n * PASSO + PAD_R))
  const BAR_W = Math.min(BAR_W_MAX, Math.max(BAR_W_MIN, Math.round(PASSO * 0.5)))
  const xSlot = (i: number) => PAD_L + i * PASSO
  const xBarra = (i: number) => xSlot(i) + (PASSO - BAR_W) / 2

  const totalMes = (d: CapexMes) => Math.max(0, d.investimentoCentavos) + Math.max(0, d.manutencaoCentavos)
  const max = Math.max(1, ...dados.map(totalMes))
  const h = (v: number) => (Math.max(0, v) / max) * hUtil

  // Rótulo esparso adaptativo: quantos '01/25' (~44px) cabem no passo real.
  const passoRot = Math.max(1, Math.ceil(44 / PASSO))

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
      <div ref={ref} className="w-full pb-1">
        {/* viewBox de largura MEDIDA + altura fixa: aspecto do box == aspecto do desenho,
            o `meet` não tem o que explodir nem letterboxar (report 03/08). */}
        <svg
          viewBox={`0 0 ${viewW} ${alto}`}
          width="100%"
          height={alto}
          preserveAspectRatio="xMidYMid meet"
          className="block"
          onMouseLeave={() => { setAtivo(null); tip.esconder() }}
        >
          {dados.map((d, i) => {
            const x = xBarra(i)
            const hInv = h(d.investimentoCentavos)
            const hMan = h(d.manutencaoCentavos)
            const opaco = ativo === null || ativo === i ? 1 : 0.45
            // Rótulo esparso: imprimir todos vira mancha ilegível em período longo (report 02/08).
            const rotula = i === ativo || i === n - 1 || (i % passoRot === 0 && n - 1 - i >= Math.ceil(passoRot / 2))
            return (
              <g key={d.mes} style={{ opacity: opaco }} className="transition-opacity duration-200">
                {hInv > 0 ? <rect x={x} y={baseY - hInv} width={BAR_W} height={hInv} fill="rgb(var(--c-accent))" /> : null}
                {hMan > 0 ? <rect x={x} y={baseY - hInv - hMan} width={BAR_W} height={hMan} rx="2" fill="rgb(var(--c-warn))" /> : null}
                {hInv === 0 && hMan === 0 ? (
                  <rect x={x} y={baseY - 2} width={BAR_W} height="2" fill="rgb(var(--c-muted))" opacity="0.6" />
                ) : null}
                {rotula ? (
                  <text x={x + BAR_W / 2} y={alto - 5} textAnchor="middle" className="fill-muted tabular-nums" style={{ fontSize: 9, fontWeight: i === ativo ? 700 : 400 }}>
                    {rotuloMes(d.mes)}
                  </text>
                ) : null}
              </g>
            )
          })}
          <line x1="0" y1={baseY} x2={viewW} y2={baseY} stroke="rgb(var(--c-bd))" strokeWidth="1.25" />
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
