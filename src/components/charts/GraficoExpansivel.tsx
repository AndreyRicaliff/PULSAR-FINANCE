/**
 * @file Card de gráfico expansível: botão no canto abre o gráfico ampliado em modal
 * (Esc/clique fora fecham) com ferramenta de ZOOM SEMÂNTICO opcional (report 03/08).
 *
 * O zoom não estica pixel (nada de transform:scale — texto borrado, eixo congelado):
 * ele amplia o ESPAÇO LÓGICO do gráfico — largura do container × fator vertical via
 * CtxEscalaGrafico — e o gráfico se REDESENHA adaptado (rótulos adensam, escala e
 * proporção se recalculam, fonte mantém o tamanho). Liga/desliga por switch; ligado,
 * a roda aproxima/afasta e o arraste faz pan. Substitui o hack `[&_svg]:!h-[55vh]`,
 * que impunha altura de fora e garantia letterbox.
 */
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useVisivelNaAbaDona } from '@/lib/abaAtiva'
import { CtxEscalaGrafico } from '@/lib/escalaGrafico'
import { useOverlay, useTravaScroll } from '@/lib/overlay'
import { somSelecao, somTick } from '@/lib/som'

/** Visão "de perto" do modal antes do zoom (os gráficos redesenham 1.6× mais altos). */
const FATOR_MODAL = 1.6
const Z_MIN = 1
const Z_MAX = 4
const Z_PASSO = 1.25

const clampZ = (z: number) => Math.min(Z_MAX, Math.max(Z_MIN, z))

interface Props {
  readonly titulo: string
  readonly children: ReactNode
  /** Variante ampliada para gráficos de tamanho fixo (ex.: Donut com tamanho maior). Default: children. */
  readonly grande?: ReactNode
  /** Gráfico adaptativo: recebe o fator de ampliação e a ferramenta de zoom no modal.
      Desligar quando o gráfico controla o próprio tamanho (Donut). */
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
          onMouseEnter={somTick}
          onClick={() => { somSelecao(); setAberto(true) }}
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
  const [zoomAtivo, setZoomAtivo] = useState(false)
  const [z, setZ] = useState(1)
  const visorRef = useRef<HTMLDivElement>(null)
  const arrasto = useRef<{ x: number; y: number; sl: number; st: number } | null>(null)

  // Esc/scroll pela fundação de overlay (pilha — Esc fecha só o topo) e o modal some
  // quando a aba dona não está ativa (estado preservado; UX 03/08).
  useOverlay(onFechar)
  useTravaScroll()
  const visivel = useVisivelNaAbaDona()

  // Roda = zoom quando a ferramenta está ligada. Listener NATIVO não-passivo: o onWheel
  // do React é passive e ignora preventDefault — o modal rolaria em vez de aproximar.
  useEffect(() => {
    const el = visorRef.current
    if (!el || !zoomAtivo) return
    const aoRolar = (e: WheelEvent) => {
      e.preventDefault()
      setZ((atual) => clampZ(atual * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
    }
    el.addEventListener('wheel', aoRolar, { passive: false })
    return () => el.removeEventListener('wheel', aoRolar)
  }, [zoomAtivo])

  const alternarZoom = () => {
    somSelecao()
    setZoomAtivo((ligado) => {
      if (ligado) setZ(1)
      return !ligado
    })
  }

  // Pan por arraste com pointer capture (sem ele o pan trava ao sair do elemento).
  function aoPressionar(e: PointerEvent<HTMLDivElement>) {
    const el = visorRef.current
    if (!el || !zoomAtivo || e.button !== 0) return
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return
    el.setPointerCapture(e.pointerId)
    arrasto.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop }
  }
  function aoArrastar(e: PointerEvent<HTMLDivElement>) {
    const el = visorRef.current
    if (!el || !arrasto.current) return
    el.scrollLeft = arrasto.current.sl - (e.clientX - arrasto.current.x)
    el.scrollTop = arrasto.current.st - (e.clientY - arrasto.current.y)
  }
  function aoSoltar(e: PointerEvent<HTMLDivElement>) {
    if (arrasto.current) visorRef.current?.releasePointerCapture(e.pointerId)
    arrasto.current = null
  }

  if (!visivel) return null
  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onFechar}>
      <div
        className="anim-pop flex max-h-[92vh] w-full max-w-6xl flex-col gap-4 overflow-auto rounded-card border border-bd bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</h2>
          <div className="flex items-center gap-2">
            {ampliarSvg ? (
              <ControlesZoom
                ativo={zoomAtivo}
                z={z}
                onAlternar={alternarZoom}
                onMenos={() => { somTick(); setZ((v) => clampZ(v / Z_PASSO)) }}
                onMais={() => { somTick(); setZ((v) => clampZ(v * Z_PASSO)) }}
                onReset={() => { somSelecao(); setZ(1) }}
              />
            ) : null}
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="fx-press grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-bd text-muted transition-colors hover:border-danger hover:text-danger"
            >
              ✕
            </button>
          </div>
        </div>
        {/* Visor: clipa o gráfico ampliado (o excedente vira pan, nunca estoura o modal).
            A largura interna z*100% faz o gráfico REMEDIR e se redesenhar adaptado. */}
        <div
          ref={visorRef}
          onPointerDown={aoPressionar}
          onPointerMove={aoArrastar}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          className={`w-full overflow-auto ${zoomAtivo && z > 1 ? 'cursor-grab select-none active:cursor-grabbing' : ''}`}
          style={{ maxHeight: '72vh' }}
        >
          <div style={{ width: `${z * 100}%` }}>
            {ampliarSvg ? <CtxEscalaGrafico.Provider value={FATOR_MODAL * z}>{children}</CtxEscalaGrafico.Provider> : children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ControlesZoom({
  ativo,
  z,
  onAlternar,
  onMenos,
  onMais,
  onReset,
}: {
  ativo: boolean
  z: number
  onAlternar: () => void
  onMenos: () => void
  onMais: () => void
  onReset: () => void
}) {
  const casca = 'fx-press grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-bd text-muted transition-colors hover:border-primary hover:text-text disabled:pointer-events-none disabled:opacity-40'
  return (
    <div className="flex items-center gap-2">
      {ativo ? (
        <>
          <button type="button" onMouseEnter={somTick} onClick={onMenos} disabled={z <= Z_MIN} title="Afastar" aria-label="Afastar" className={casca}>
            <IconeMenos />
          </button>
          <span className="w-11 text-center text-xs tabular-nums text-muted">{Math.round(z * 100)}%</span>
          <button type="button" onMouseEnter={somTick} onClick={onMais} disabled={z >= Z_MAX} title="Aproximar" aria-label="Aproximar" className={casca}>
            <IconeMais />
          </button>
          <button type="button" onMouseEnter={somTick} onClick={onReset} disabled={z === 1} title="Restaurar zoom" aria-label="Restaurar zoom" className={casca}>
            <IconeRestaurar />
          </button>
        </>
      ) : null}
      <button
        type="button"
        onMouseEnter={somTick}
        onClick={onAlternar}
        aria-pressed={ativo}
        title={ativo ? 'Desligar a ferramenta de zoom' : 'Ligar a ferramenta de zoom (roda aproxima, arraste move)'}
        className={`fx-press flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
          ativo ? 'border-primary bg-primary/10 text-text' : 'border-bd text-muted hover:border-primary hover:text-text'
        }`}
      >
        <IconeLupa />
        Zoom
      </button>
    </div>
  )
}

const ICONE = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

function IconeLupa() {
  return (
    <svg {...ICONE}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

function IconeMais() {
  return (
    <svg {...ICONE}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6M11 8v6" />
    </svg>
  )
}

function IconeMenos() {
  return (
    <svg {...ICONE}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6" />
    </svg>
  )
}

function IconeRestaurar() {
  return (
    <svg {...ICONE}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  )
}

function IconeExpandir() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}
