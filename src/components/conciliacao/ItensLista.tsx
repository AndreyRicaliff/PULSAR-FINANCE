/** @file Linhas de itens conciliados dentro de grupo/subgrupo (arrastáveis, botão direito). */
import type { MouseEvent } from 'react'
import { brl } from '@/lib/money'
import type { ItemConc } from './tipos'

interface Props {
  readonly itens: readonly ItemConc[]
  readonly onDesmapear: (chave: string) => void
  readonly onContextItem: (chave: string, e: MouseEvent) => void
  readonly vazio: string
}

export function ItensLista({ itens, onDesmapear, onContextItem, vazio }: Props) {
  if (itens.length === 0) {
    return vazio ? <p className="px-4 py-2 text-xs text-muted">{vazio}</p> : null
  }
  return (
    <ul className="divide-y divide-bd/60">
      {itens.map((i) => (
        <Item key={i.chave} item={i} onDesmapear={onDesmapear} onContextItem={onContextItem} />
      ))}
    </ul>
  )
}

function Item({
  item,
  onDesmapear,
  onContextItem,
}: {
  item: ItemConc
  onDesmapear: (chave: string) => void
  onContextItem: (chave: string, e: MouseEvent) => void
}) {
  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', item.chave)}
      onContextMenu={(e) => onContextItem(item.chave, e)}
      className="flex cursor-grab items-center justify-between gap-2 px-4 py-2 text-sm active:cursor-grabbing"
    >
      <span className="min-w-0 flex-1 truncate">{item.titulo}</span>
      <span className="flex shrink-0 items-center gap-3">
        {item.qtd ? <span className="text-xs text-muted">{item.qtd} mov.</span> : null}
        <span className="tabular-nums text-muted">{brl(item.valorCentavos)}</span>
        <button
          type="button"
          onClick={() => onDesmapear(item.chave)}
          title="Desconciliar"
          className="text-muted hover:text-danger"
        >
          ✕
        </button>
      </span>
    </li>
  )
}
