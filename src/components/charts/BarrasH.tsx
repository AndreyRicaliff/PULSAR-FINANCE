/** @file Barras horizontais (ranking) — SVG puro, tokens AG, tooltip com participação. */
import type { Fatia } from '@/lib/graficos'
import { brl, pct } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'

export function BarrasH({ itens }: { itens: readonly Fatia[] }) {
  const tip = useTooltipGrafico('rgb(var(--c-primary))')
  if (itens.length === 0) return <p className="text-sm text-muted">Nada conciliado.</p>
  const max = Math.max(1, ...itens.map((i) => i.valorCentavos))
  const total = itens.reduce((s, i) => s + i.valorCentavos, 0)
  return (
    <div className="flex flex-col gap-3">
      {itens.map((i, pos) => (
        <div
          key={i.label}
          className="group flex flex-col gap-1"
          onMouseMove={(e) =>
            tip.mostrar(
              e,
              <>
                <TipTitulo>{`#${pos + 1} · ${i.label}`}</TipTitulo>
                <TipLinha rotulo="Valor" valor={brl(i.valorCentavos)} />
                <TipLinha rotulo="Participação" valor={`${pct(i.valorCentavos, total)} do total listado`} />
              </>,
            )
          }
          onMouseLeave={tip.esconder}
        >
          <div className="flex justify-between text-sm">
            <span className="transition-colors group-hover:text-primary">{i.label}</span>
            <span className="tabular-nums text-muted">{brl(i.valorCentavos)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface2">
            <div
              className="anim-grow-x h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-opacity duration-200 group-hover:opacity-85"
              style={{ width: `${(i.valorCentavos / max) * 100}%`, animationDelay: `${pos * 0.05}s` }}
            />
          </div>
        </div>
      ))}
      {tip.tooltip}
    </div>
  )
}
