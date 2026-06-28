/** @file Nó recursivo da árvore de drill-down; folhas viram TabelaMov. */
import { brl } from '@/lib/money'
import type { NoMov } from './arvoreMov'
import { TabelaMov } from './TabelaMov.tsx'

export function GrupoArvore({ no, nivel }: { no: NoMov; nivel: number }) {
  const folha = no.filhos.length === 0
  return (
    <details className="border-b border-bd/50 last:border-0" open={folha && no.itens.length <= 5}>
      <summary
        className="flex cursor-pointer items-center justify-between py-2 pr-6 hover:bg-surface2"
        style={{ paddingLeft: 24 + nivel * 16 }}
      >
        <span className="font-medium">{no.rotulo}</span>
        <span className="flex items-center gap-4">
          <span className="text-xs text-muted">{no.qtd} mov.</span>
          <span className="font-semibold tabular-nums">{brl(no.totalCentavos)}</span>
        </span>
      </summary>
      {folha ? (
        <TabelaMov movimentos={no.itens} />
      ) : (
        no.filhos.map((f) => <GrupoArvore key={f.chave} no={f} nivel={nivel + 1} />)
      )}
    </details>
  )
}
