/**
 * @file Seletor com BUSCA padrão do app (pedido 03/08 — fim das "sanfonas" nativas):
 * o <select> nativo com lista longa estoura o layout, não filtra e não mostra etiqueta.
 * Painel via portal em position:fixed (não é clipado por tabela com overflow); Esc entra
 * na pilha de overlays (fecha só o dropdown); rolar a página fecha (o fixed não acompanha).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { normalizarTexto } from '@/core/texto'
import { useOverlay } from '@/lib/overlay'
import { CampoBusca } from './CampoBusca.tsx'

export interface OpcaoBusca {
  readonly valor: string
  readonly rotulo: string
  /** Complemento discreto no fim da linha (ex.: provedor, código). Entra na busca. */
  readonly detalhe?: string
  /** Nó livre no fim da linha (pill/etiqueta) — não entra na busca. */
  readonly extra?: ReactNode
}

interface Props {
  readonly opcoes: readonly OpcaoBusca[]
  /** Valor selecionado (mostrado no gatilho quando `fixarEscolha`). */
  readonly valor?: string
  readonly onEscolher: (valor: string) => void
  readonly rotuloVazio?: string
  readonly placeholderBusca?: string
  /** false = seletor de AÇÃO ("conciliar em…"): o gatilho nunca troca de rótulo. */
  readonly fixarEscolha?: boolean
  readonly classeGatilho?: string
  readonly titulo?: string
  readonly desabilitado?: boolean
}

const CLASSE_PADRAO =
  'flex w-full items-center justify-between gap-2 rounded-lg border border-bd bg-surface2 px-3 py-2 text-left text-sm outline-none transition-colors hover:border-primary disabled:opacity-50'

export function SeletorBusca({
  opcoes,
  valor,
  onEscolher,
  rotuloVazio = '— escolher —',
  placeholderBusca = 'Buscar…',
  fixarEscolha = true,
  classeGatilho = CLASSE_PADRAO,
  titulo,
  desabilitado = false,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const gatilhoRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)
  const escolhida = fixarEscolha ? opcoes.find((o) => o.valor === valor) : undefined

  const visiveis = useMemo(() => {
    const q = normalizarTexto(busca)
    const qCru = busca.trim().toLowerCase()
    if (!q && !qCru) return opcoes
    return opcoes.filter(
      (o) =>
        (q !== '' && normalizarTexto(`${o.rotulo} ${o.detalhe ?? ''}`).includes(q)) ||
        (qCru !== '' && o.valor.toLowerCase().includes(qCru)),
    )
  }, [opcoes, busca])

  function abrir() {
    const r = gatilhoRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.max(r.width, 280)
    setPos({ left: Math.min(r.left, window.innerWidth - width - 8), top: r.bottom + 4, width })
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setBusca('')
  }

  function escolher(v: string) {
    onEscolher(v)
    fechar()
  }

  // Painel é fixed: rolar qualquer scroller desalinharia — rolagem fora da lista fecha.
  useEffect(() => {
    if (!aberto) return
    const aoRolar = (e: Event) => {
      if (e.target instanceof Node && document.getElementById('seletor-busca-painel')?.contains(e.target)) return
      fechar()
    }
    window.addEventListener('scroll', aoRolar, true)
    return () => window.removeEventListener('scroll', aoRolar, true)
  }, [aberto])

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (aberto) fechar()
          else abrir()
        }}
        disabled={desabilitado || opcoes.length === 0}
        title={titulo}
        className={classeGatilho}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`truncate ${escolhida ? '' : 'text-muted'}`}>{escolhida?.rotulo ?? rotuloVazio}</span>
          {escolhida?.extra}
        </span>
        <span className="shrink-0 text-xs text-muted">▾</span>
      </button>
      {aberto && pos
        ? createPortal(
            <>
              <RegistraEsc onFechar={fechar} />
              <div className="fixed inset-0 z-[60]" onClick={fechar} aria-hidden />
              <div
                id="seletor-busca-painel"
                className="fixed z-[70] flex flex-col overflow-hidden rounded-lg border border-bd bg-surface shadow-brand"
                style={{ left: pos.left, top: pos.top, width: pos.width }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-bd p-2">
                  <CampoBusca valor={busca} onValor={setBusca} placeholder={placeholderBusca} visiveis={visiveis.length} total={opcoes.length} />
                </div>
                <ul className="max-h-64 overflow-auto p-1">
                  {visiveis.map((o) => (
                    <li key={o.valor}>
                      <button
                        type="button"
                        onClick={() => escolher(o.valor)}
                        className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-sm ${
                          fixarEscolha && o.valor === valor ? 'bg-primary/15 text-text' : 'hover:bg-surface2'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{o.rotulo}</span>
                        {o.detalhe ? <span className="shrink-0 text-xs text-muted">{o.detalhe}</span> : null}
                        {o.extra}
                      </button>
                    </li>
                  ))}
                  {visiveis.length === 0 ? <li className="px-2.5 py-2 text-sm text-muted">Nada casa com a busca.</li> : null}
                </ul>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}

/** Esc na pilha de overlays só enquanto o dropdown está aberto (hooks no filho). */
function RegistraEsc({ onFechar }: { onFechar: () => void }) {
  useOverlay(onFechar)
  return null
}
