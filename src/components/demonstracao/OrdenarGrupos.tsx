/** @file Reordenação dos grupos da estrutura: arrastar define a posição (número = posição). */
import { brl } from '@/lib/money'

export interface GrupoOrdem {
  readonly id: string
  readonly nome: string
  readonly totalCentavos: number
}

interface Props {
  readonly grupos: readonly GrupoOrdem[]
  readonly onReordenar: (id: string, novoIndice: number) => void
}

export function OrdenarGrupos({ grupos, onReordenar }: Props) {
  const soltar = (e: React.DragEvent, alvo: number) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) onReordenar(id, alvo)
  }
  return (
    <div className="rounded-card border border-bd bg-surface">
      <p className="border-b border-bd px-4 py-2 text-xs text-muted">
        Arraste para reordenar — o número passa a ser a posição (não muda classificação nem grupo).
      </p>
      <ul className="divide-y divide-bd/50">
        {grupos.map((g, i) => (
          <li
            key={g.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', g.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => soltar(e, i)}
            className="flex cursor-grab items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-surface2/40 active:cursor-grabbing"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-muted" aria-hidden>
                ⠿
              </span>
              <span className="truncate">{g.nome}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">{brl(g.totalCentavos)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
