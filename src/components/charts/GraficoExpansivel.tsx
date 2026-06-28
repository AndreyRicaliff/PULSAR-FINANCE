/** @file Card de gráfico expansível: botão no canto abre o gráfico ampliado em modal (Esc/clique fora fecham). */
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  readonly titulo: string
  readonly children: ReactNode
  /** Variante ampliada para gráficos de tamanho fixo (ex.: Donut com tamanho maior). Default: children. */
  readonly grande?: ReactNode
  /** Força SVGs do modal a 55vh — desligar quando o gráfico controla o próprio tamanho (Donut). */
  readonly ampliarSvg?: boolean
}

export function GraficoExpansivel({ titulo, children, grande, ampliarSvg = true }: Props) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="card-hover rounded-card border border-bd bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</h2>
        <button
          type="button"
          onClick={() => setAberto(true)}
          title="Expandir gráfico"
          aria-label={`Expandir gráfico: ${titulo}`}
          className="fx-press grid h-7 w-7 shrink-0 place-items-center rounded-md border border-bd text-muted transition-colors hover:border-primary hover:text-text"
        >
          <IconeExpandir />
        </button>
      </div>
      {children}
      {aberto ? (
        <Modal titulo={titulo} ampliarSvg={ampliarSvg} onFechar={() => setAberto(false)}>
          {grande ?? children}
        </Modal>
      ) : null}
    </div>
  )
}

interface PropsModal {
  readonly titulo: string
  readonly ampliarSvg: boolean
  readonly onFechar: () => void
  readonly children: ReactNode
}

function Modal({ titulo, ampliarSvg, onFechar, children }: PropsModal) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onFechar}>
      <div
        className="anim-pop flex max-h-[92vh] w-full max-w-6xl flex-col gap-4 overflow-auto rounded-card border border-bd bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="fx-press grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-bd text-muted transition-colors hover:border-danger hover:text-danger"
          >
            ✕
          </button>
        </div>
        {/* SVGs com viewBox crescem até 55vh; gráficos em div ganham só largura (alturas px próprias). */}
        <div className={ampliarSvg ? '[&_svg]:!h-[55vh]' : ''}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function IconeExpandir() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}
