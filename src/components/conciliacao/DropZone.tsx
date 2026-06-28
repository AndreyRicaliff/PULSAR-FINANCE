/** @file Zona de soltura do drag-and-drop com destaque visual; stopPropagation isola subgrupo do grupo. */
import { useState, type ReactNode } from 'react'

interface Props {
  readonly onSoltar: (chave: string) => void
  readonly className: string
  readonly children: ReactNode
}

export function DropZone({ onSoltar, className, children }: Props) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation() // só a zona mais interna (subgrupo) destaca
        setHover(true)
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation() // evita o DropZone pai (raiz) sobrescrever o mapeamento do subgrupo
        const chave = e.dataTransfer.getData('text/plain')
        if (chave) onSoltar(chave)
        setHover(false)
      }}
      className={`${className} transition-colors ${hover ? 'border-primary ring-2 ring-primary/60' : ''}`}
    >
      {children}
    </div>
  )
}
