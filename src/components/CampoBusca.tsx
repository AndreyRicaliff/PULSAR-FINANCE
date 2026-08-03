/**
 * @file Campo de busca padrão do app (UX 03/08): lupa, Esc limpa, botão ✕ e contador
 * "X de Y" — o padrão que nasceu na Matriz, extraído pra valer em toda lista. O atalho
 * global "/" foca o campo visível (data-campo-busca é a âncora do Shell).
 */
import { type KeyboardEvent } from 'react'

interface Props {
  readonly valor: string
  readonly onValor: (v: string) => void
  readonly placeholder: string
  /** Contador "X de Y" quando a busca está ativa. */
  readonly visiveis?: number
  readonly total?: number
  readonly ariaLabel?: string
  readonly classe?: string
}

export function CampoBusca({ valor, onValor, placeholder, visiveis, total, ariaLabel, classe = '' }: Props) {
  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && valor) {
      // Só consome o Esc quando há o que limpar — vazio deixa subir pro overlay fechar.
      e.stopPropagation()
      onValor('')
    }
  }
  return (
    <div className={`flex items-center gap-2 ${classe}`}>
      <div className="relative min-w-0 flex-1">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          data-campo-busca
          value={valor}
          onChange={(e) => onValor(e.target.value)}
          onKeyDown={aoTeclar}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className="w-full rounded-lg border border-bd bg-surface py-2 pl-9 pr-9 text-sm outline-none placeholder:text-muted focus:border-primary"
        />
        {valor ? (
          <button
            type="button"
            onClick={() => onValor('')}
            title="Limpar busca (Esc)"
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted hover:text-text"
          >
            ✕
          </button>
        ) : null}
      </div>
      {valor && visiveis !== undefined && total !== undefined ? (
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {visiveis} de {total}
        </span>
      ) : null}
    </div>
  )
}
