/** @file Controles de zoom do gráfico (+ / − / 100%) — aparecem sobre o canto do desenho. */
import type { ZoomGrafico } from '@/lib/zoomGrafico'

export function ControlesZoom({ zoom }: { zoom: ZoomGrafico }) {
  const btn =
    'fx-press grid h-7 w-7 place-items-center rounded-md border border-bd bg-surface/90 text-sm text-muted backdrop-blur transition-colors hover:border-primary hover:text-text disabled:opacity-40 disabled:hover:border-bd'
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={zoom.afastar} disabled={!zoom.ativo} title="Afastar" aria-label="Afastar" className={btn}>
        −
      </button>
      <button type="button" onClick={zoom.aproximar} disabled={zoom.nivel >= 8} title="Aproximar" aria-label="Aproximar" className={btn}>
        +
      </button>
      <button
        type="button"
        onClick={zoom.reset}
        disabled={!zoom.ativo}
        title="Voltar ao tamanho normal"
        aria-label="Voltar ao tamanho normal"
        className={`${btn} w-auto px-2 text-[11px] tabular-nums`}
      >
        {zoom.ativo ? `${zoom.nivel.toFixed(1)}×` : '1×'}
      </button>
    </div>
  )
}
