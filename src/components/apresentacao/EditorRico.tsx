/** @file Editor de texto rico mínimo (sem dependência): contentEditable + toolbar (negrito/itálico/etc.). */
import { useEffect, useRef } from 'react'
import { sanitizarHtml } from '@/lib/sanitizarHtml'

const COMANDOS = [
  { cmd: 'bold', rotulo: 'B', titulo: 'Negrito', classe: 'font-bold' },
  { cmd: 'italic', rotulo: 'I', titulo: 'Itálico', classe: 'italic' },
  { cmd: 'underline', rotulo: 'U', titulo: 'Sublinhado', classe: 'underline' },
  { cmd: 'insertUnorderedList', rotulo: '• Lista', titulo: 'Lista', classe: '' },
] as const

export function EditorRico({
  valor,
  onChange,
  placeholder,
  linhas = 20,
}: {
  valor: string
  onChange: (html: string) => void
  placeholder?: string
  linhas?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Sincroniza só quando o valor externo diverge do DOM (evita resetar o cursor a cada tecla).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== valor) ref.current.innerHTML = valor
  }, [valor])

  const emitir = () => ref.current && onChange(sanitizarHtml(ref.current.innerHTML))
  const exec = (cmd: string) => {
    document.execCommand(cmd)
    ref.current?.focus()
    emitir()
  }

  return (
    <div className="rounded-lg border border-bd bg-surface2">
      <div className="flex gap-1 border-b border-bd px-2 py-1">
        {COMANDOS.map((c) => (
          <button
            key={c.cmd}
            type="button"
            // onMouseDown + preventDefault: mantém a seleção no editor ao clicar no botão.
            onMouseDown={(e) => {
              e.preventDefault()
              exec(c.cmd)
            }}
            title={c.titulo}
            className={`rounded px-2 py-0.5 text-xs text-muted hover:bg-surface hover:text-text ${c.classe}`}
          >
            {c.rotulo}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        onInput={emitir}
        data-placeholder={placeholder}
        style={{ maxHeight: `${linhas * 1.7}em` }}
        className="min-h-[5rem] overflow-y-auto px-3 py-2 text-sm leading-relaxed text-text outline-none [&:empty::before]:text-muted/50 [&:empty::before]:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  )
}
