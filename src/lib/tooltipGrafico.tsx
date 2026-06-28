/**
 * @file Tooltip rico dos gráficos: segue o cursor com conteúdo arbitrário via portal.
 * Substitui os <title>/title nativos (atraso de ~1s e visual fora do DS). Um hook por gráfico.
 */
import { useCallback, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface TooltipGrafico {
  readonly tooltip: ReactNode
  readonly mostrar: (e: MouseEvent, conteudo: ReactNode) => void
  readonly esconder: () => void
}

const LARGURA = 240
const ALTURA_FLIP = 140

/** `cor` (ex.: 'rgb(var(--c-accent))') pinta a borda superior do popup com a cor do gráfico. */
export function useTooltipGrafico(cor?: string): TooltipGrafico {
  const [estado, setEstado] = useState<{ x: number; y: number; conteudo: ReactNode } | null>(null)

  const mostrar = useCallback((e: MouseEvent, conteudo: ReactNode) => {
    setEstado({ x: e.clientX, y: e.clientY, conteudo })
  }, [])
  const esconder = useCallback(() => setEstado(null), [])

  const tooltip = estado
    ? createPortal(
        <div
          className="pointer-events-none fixed z-[70] min-w-44 rounded-lg border border-bd bg-surface/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-sm"
          style={{ ...posicao(estado.x, estado.y), ...(cor ? { borderTopWidth: 2, borderTopColor: cor } : {}) }}
        >
          {estado.conteudo}
        </div>,
        document.body,
      )
    : null

  return { tooltip, mostrar, esconder }
}

/** Vira para o outro lado perto das bordas direita/inferior da janela. */
function posicao(x: number, y: number): CSSProperties {
  const esquerda = x > window.innerWidth - (LARGURA + 24)
  const acima = y > window.innerHeight - ALTURA_FLIP
  return {
    left: esquerda ? x - LARGURA - 12 : x + 12,
    top: acima ? y - ALTURA_FLIP + 30 : y + 14,
    maxWidth: LARGURA,
  }
}

export function TipTitulo({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 border-b border-bd/60 pb-1 text-[13px] font-semibold">{children}</p>
}

export function TipLinha({ rotulo, valor, classe }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <p className="flex items-center justify-between gap-4 leading-5">
      <span className="text-muted">{rotulo}</span>
      <span className={`font-semibold tabular-nums ${classe ?? ''}`}>{valor}</span>
    </p>
  )
}
