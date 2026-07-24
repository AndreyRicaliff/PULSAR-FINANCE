/** @file Barras com eixo zero: positivo sobe, negativo desce — marca fina (dataviz), tooltip por barra. */
import { brl } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico } from '@/lib/tooltipGrafico'

export interface PassoWF {
  readonly rotulo: string
  readonly valor: number
  readonly tipo: 'delta' | 'total'
}

const H = 240
// Respiro vertical: as barras não encostam nas bordas, senão o rótulo de valor (acima/abaixo
// da ponta) é cortado pelo card. O plot vive em [PAD, H-PAD]; o PAD é o espaço do rótulo.
const PAD = 22

/** Currency compacto p/ rótulo na ponta da barra (o tooltip mostra o valor cheio). */
function curto(centavos: number): string {
  const r = centavos / 100
  const a = Math.abs(r)
  const s = r < 0 ? '-' : ''
  if (a >= 1_000_000) return `${s}R$ ${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`
  if (a >= 1_000) return `${s}R$ ${Math.round(a / 1_000)}k`
  return `${s}R$ ${Math.round(a)}`
}

/** Cada barra parte do eixo zero: valor positivo sobe (verde), negativo desce (vermelho); total em roxo. */
export function Waterfall({ passos }: { passos: readonly PassoWF[] }) {
  const tip = useTooltipGrafico()
  const valores = passos.map((p) => p.valor)
  const max = Math.max(0, ...valores)
  const min = Math.min(0, ...valores)
  const span = max - min || 1
  const y = (v: number) => PAD + ((max - v) / span) * (H - 2 * PAD)
  const yZero = y(0)

  return (
    <div>
      <div className="relative flex items-end gap-1.5" style={{ height: H }}>
        <div className="absolute left-0 right-0 border-t border-bd" style={{ top: yZero }} />
        {passos.map((p, i) => {
          const sobe = p.valor >= 0
          const topo = sobe ? y(p.valor) : yZero
          const altura = Math.max(3, Math.abs(yZero - y(p.valor)))
          const cor =
            p.tipo === 'total'
              ? 'from-primary/70 to-primary'
              : sobe
                ? 'from-accent/45 to-accent'
                : 'from-danger/45 to-danger'
          const arred = sobe ? 'rounded-t-md' : 'rounded-b-md'
          const labelTop = sobe ? Math.max(1, topo - 15) : Math.min(H - 13, topo + altura + 3)
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
              <span
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium tabular-nums text-muted"
                style={{ top: labelTop }}
              >
                {curto(p.valor)}
              </span>
              <div
                className={`anim-grow-y absolute left-1/2 w-[56%] max-w-[36px] -translate-x-1/2 bg-gradient-to-t ${cor} ${arred} shadow-sm transition-opacity duration-200 group-hover:opacity-80`}
                style={{ top: topo, height: altura, transformOrigin: sobe ? 'bottom' : 'top', animationDelay: `${i * 0.04}s` }}
              />
            </div>
          )
        })}
      </div>
      {tip.tooltip}
      <div className="mt-2 flex gap-1.5">
        {passos.map((p) => (
          <p key={p.rotulo} className="flex-1 truncate text-center text-[11px] font-medium text-muted" title={p.rotulo}>
            {p.rotulo}
          </p>
        ))}
      </div>
    </div>
  )
}
