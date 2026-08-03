/**
 * @file Quick-switcher de abas (Ctrl/Cmd+K — UX 03/08): navegação sem mouse. Lista as
 * abas filtráveis por texto (sem acento/caixa); Enter vai, Esc fecha (pilha de overlay).
 */
import { useMemo, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { normalizarTexto } from '@/core/texto'
import { useOverlay, useTravaScroll } from '@/lib/overlay'
import { ROTULO_ABA, type Aba } from './Sidebar.tsx'

interface Props {
  readonly onIr: (aba: Aba) => void
  readonly onFechar: () => void
}

export function PaletaAbas({ onIr, onFechar }: Props) {
  useOverlay(onFechar)
  useTravaScroll()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)

  const opcoes = useMemo(() => {
    const nq = normalizarTexto(q)
    return (Object.entries(ROTULO_ABA) as [Aba, string][]).filter(([, rotulo]) => !nq || normalizarTexto(rotulo).includes(nq))
  }, [q])
  const ativo = Math.min(sel, Math.max(0, opcoes.length - 1))

  function escolher(aba: Aba) {
    onIr(aba)
    onFechar()
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((s) => Math.min(s + 1, opcoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && opcoes[ativo]) {
      escolher(opcoes[ativo][0])
    }
  }

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 pt-[18vh]" onClick={onFechar}>
      <div
        className="anim-pop flex w-full max-w-md flex-col overflow-hidden rounded-card border border-bd bg-surface"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Ir para aba"
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={aoTeclar}
          placeholder="Ir para… (↑↓ e Enter)"
          className="border-b border-bd bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted"
        />
        <ul className="max-h-[40vh] overflow-auto p-1.5">
          {opcoes.map(([aba, rotulo], i) => (
            <li key={aba}>
              <button
                type="button"
                onClick={() => escolher(aba)}
                onMouseEnter={() => setSel(i)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  i === ativo ? 'bg-primary/15 text-text' : 'text-muted'
                }`}
              >
                {rotulo}
              </button>
            </li>
          ))}
          {opcoes.length === 0 ? <li className="px-3 py-2 text-sm text-muted">Nenhuma aba casa com a busca.</li> : null}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
