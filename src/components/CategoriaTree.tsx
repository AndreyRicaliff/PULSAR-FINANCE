/** @file Árvore recursiva de categorias Omie com totais por nó. */
import { useState } from 'react'
import type { NoCategoria } from '@/lib/arvore'
import { brl } from '@/lib/money'
import { COR_NATUREZA } from '@/lib/natureza'
import { useOverrides } from '@/lib/overrides'
import { BadgeEditado } from './BadgeEditado.tsx'

interface Props {
  readonly no: NoCategoria
  readonly depth: number
  readonly onAbrir: (no: NoCategoria) => void
}

export function CategoriaTree({ no, depth, onAbrir }: Props) {
  const { resolvedor } = useOverrides()
  const [aberto, setAberto] = useState(depth === 0)
  const temFilhos = no.filhos.length > 0
  const temProprios = no.proprioQtd > 0
  const nome = resolvedor.categoria(no.codigo)

  return (
    <>
      <tr className="border-b border-bd/60 hover:bg-surface2/60">
        <td className="py-2.5 pr-4" style={{ paddingLeft: 16 + depth * 18 }}>
          <div className="flex items-center gap-2">
            {temFilhos ? (
              <button
                type="button"
                onClick={() => setAberto((v) => !v)}
                className="w-4 shrink-0 text-muted hover:text-text"
              >
                {aberto ? '▾' : '▸'}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span className="font-mono text-xs tabular-nums text-muted">{no.codigo}</span>
            <button
              type="button"
              disabled={!temProprios}
              onClick={() => onAbrir(no)}
              className={`text-left ${temFilhos ? 'font-semibold' : ''} ${
                temProprios ? 'hover:text-primary' : 'cursor-default'
              }`}
              title={temProprios ? 'Ver movimentos desta conta' : undefined}
            >
              {nome.nome}
            </button>
            {nome.editado ? <BadgeEditado original={nome.original} /> : null}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${COR_NATUREZA[no.natureza]}`}>
              {no.natureza}
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-muted">{no.quantidade}</td>
        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{brl(no.totalCentavos)}</td>
      </tr>
      {aberto
        ? no.filhos.map((f) => (
            <CategoriaTree key={f.codigo} no={f} depth={depth + 1} onAbrir={onAbrir} />
          ))
        : null}
    </>
  )
}
