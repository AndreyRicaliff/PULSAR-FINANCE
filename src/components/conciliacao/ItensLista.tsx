/** @file Linhas de itens conciliados dentro de grupo/subgrupo (arrastáveis, botão direito). */
import type { MouseEvent, ReactNode } from 'react'
import type { MetaContabil } from '@/core/modelo'
import { brl } from '@/lib/money'
import { Grip } from '../demonstracao/atomos.tsx'
import { EtiquetaFluxo } from './EtiquetaFluxo.tsx'
import { EtiquetaRegime } from './EtiquetaRegime.tsx'
import type { ItemConc } from './tipos'

interface Props {
  readonly itens: readonly ItemConc[]
  readonly onDesmapear: (chave: string) => void
  readonly onContextItem: (chave: string, e: MouseEvent) => void
  readonly vazio: string
  /** Regime do nó pai + raiz — quando presente, cada categoria ganha a etiqueta DRE/DFC. */
  readonly meta?: MetaContabil
  readonly metaRaiz?: MetaContabil
  readonly mostrarRegime?: boolean
}

export function ItensLista({ itens, onDesmapear, onContextItem, vazio, meta, metaRaiz, mostrarRegime }: Props) {
  if (itens.length === 0) {
    return vazio ? <p className="px-4 py-2 text-xs text-muted">{vazio}</p> : null
  }
  return (
    <ul className="divide-y divide-bd/60">
      {itens.map((i) => (
        <Item
          key={i.chave}
          item={i}
          onDesmapear={onDesmapear}
          onContextItem={onContextItem}
          etiqueta={mostrarRegime ? <EtiquetaRegime meta={meta} metaRaiz={metaRaiz} /> : null}
        />
      ))}
    </ul>
  )
}

function Item({
  item,
  onDesmapear,
  onContextItem,
  etiqueta,
}: {
  item: ItemConc
  onDesmapear: (chave: string) => void
  onContextItem: (chave: string, e: MouseEvent) => void
  etiqueta: ReactNode
}) {
  // Só a alça ⠿ arrasta (não o <li> inteiro) — mesmo motivo do AConciliar: linha draggable
  // rouba o clique do botão ✕/menu interno. Ver demonstracao/atomos.tsx.
  return (
    <li
      onContextMenu={(e) => onContextItem(item.chave, e)}
      className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
    >
      <Grip chave={item.chave} />
      <span className="min-w-0 flex-1 truncate">{item.titulo}</span>
      <EtiquetaFluxo natureza={item.natureza} />
      {etiqueta}
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
