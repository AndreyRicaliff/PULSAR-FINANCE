/** @file Barras com eixo zero: positivo sobe, negativo desce — SVG/divs puros, tooltip por barra. */
import { brl } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'

export interface PassoWF {
  readonly rotulo: string
  readonly valor: number
  readonly tipo: 'delta' | 'total'
}

const H = 240

/** Cada barra parte do eixo zero: valor positivo sobe (verde), negativo desce (vermelho); total em roxo. */
export function Waterfall({ passos }: { passos: readonly PassoWF[] }) {
  const tip = useTooltipGrafico()
  const valores = passos.map((p) => p.valor)
  const max = Math.max(0, ...valores)
  const min = Math.min(0, ...valores)
  const span = max - min || 1
  const y = (v: number) => ((max - v) / span) * H
  const yZero = y(0)

  return (
    <div>
      <div className="relative flex items-end gap-2" style={{ height: H }}>
        <div className="absolute left-0 right-0 border-t border-bd/80" style={{ top: yZero }} />
        {passos.map((p, i) => {
          const sobe = p.valor >= 0
          const topo = sobe ? y(p.valor) : yZero
          const altura = Math.max(2, Math.abs(yZero - y(p.valor)))
          const cor =
            p.tipo === 'total'
              ? 'bg-gradient-to-t from-primary/60 to-primary'
              : sobe
                ? 'bg-gradient-to-t from-accent/60 to-accent'
                : 'bg-gradient-to-b from-danger/60 to-danger'
          const conteudo = (
            <>
              <TipTitulo>{p.rotulo}</TipTitulo>
              <TipLinha rotulo="Valor" valor={brl(p.valor)} classe={p.valor < 0 ? 'text-danger' : 'text-accent'} />
            </>
          )
          return (
            <div
              key={p.rotulo}
              className="group relative flex-1"
              style={{ height: H }}
              onMouseMove={(e) => tip.mostrar(e, conteudo)}
              onMouseLeave={tip.esconder}
            >
              <div
                className={`anim-grow-y absolute w-full rounded transition-opacity duration-200 group-hover:opacity-80 ${cor}`}
                style={{ top: topo, height: altura, animationDelay: `${i * 0.04}s` }}
              />
            </div>
          )
        })}
      </div>
      {tip.tooltip}
      <div className="mt-2 flex gap-2">
        {passos.map((p) => (
          <div key={p.rotulo} className="flex-1 text-center">
            <p className="truncate text-[10px] text-muted" title={p.rotulo}>{p.rotulo}</p>
            <p className={`text-[11px] font-semibold tabular-nums ${p.valor < 0 ? 'text-danger' : ''}`}>{brl(p.valor)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
