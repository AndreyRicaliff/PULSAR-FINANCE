/** @file Card de grupo da estrutura: cabeçalho recolhível, subgrupos, drop zones e menu de contexto. */
import { useState, type MouseEvent } from 'react'
import type { No, RegimeDemo } from '@/core/modelo'
import { etiquetasContabeis } from '@/core/modelo'
import { brl } from '@/lib/money'
import { DropZone } from './DropZone.tsx'
import { ItensLista } from './ItensLista.tsx'
import type { ItemConc } from './tipos'
import { itensDoNo, totalCentavos } from './util'

interface Props {
  readonly raiz: No
  readonly subgrupos: readonly No[]
  readonly mapa: Readonly<Record<string, string>>
  readonly porChave: ReadonlyMap<string, ItemConc>
  readonly recolhido: boolean
  readonly onAlternarRecolhido: (id: string) => void
  readonly onAddSub: (nome: string, regime?: RegimeDemo) => void
  /** Permite escolher o regime (DRE/DFC/ambos) do subgrupo — só na dimensão de contas. */
  readonly permiteRegime: boolean
  readonly onRemoveNo: (id: string) => void
  readonly onMapear: (chave: string, noId: string) => void
  readonly onDesmapear: (chave: string) => void
  readonly onContextItem: (chave: string, e: MouseEvent) => void
  readonly onContextNo: (noId: string, raiz: boolean, e: MouseEvent) => void
}

export function RaizCard(props: Props) {
  const { raiz, subgrupos, mapa, porChave, recolhido, onAddSub, onRemoveNo, onMapear, onDesmapear } = props
  const direto = itensDoNo(raiz.id, mapa, porChave)
  const dosSubs = subgrupos.map((s) => itensDoNo(s.id, mapa, porChave))
  const total = totalCentavos(direto) + dosSubs.reduce((a, l) => a + totalCentavos(l), 0)
  const qtd = direto.length + dosSubs.reduce((a, l) => a + l.length, 0)

  // Classificação só em SUBGRUPO: a raiz não aceita drop (item solto no grupo some dos gráficos).
  return (
    <div className="rounded-card border border-bd bg-surface">
      <Cabecalho
        raiz={raiz}
        total={total}
        qtd={qtd}
        recolhido={recolhido}
        onAlternar={() => props.onAlternarRecolhido(raiz.id)}
        onContextNo={(e) => props.onContextNo(raiz.id, true, e)}
      />
      {recolhido ? null : (
        <>
          <ItensLista itens={direto} onDesmapear={onDesmapear} onContextItem={props.onContextItem} vazio="" />
          {subgrupos.length === 0 ? (
            <div className="px-4 py-2 text-xs text-warn">
              Crie um subgrupo abaixo para classificar — categorias soltas no grupo não aparecem separadas nos gráficos.
            </div>
          ) : null}
          {subgrupos.map((s, idx) => (
            <Subgrupo
              key={s.id}
              no={s}
              itens={dosSubs[idx] ?? []}
              onSoltar={(c) => onMapear(c, s.id)}
              onRemover={() => onRemoveNo(s.id)}
              onDesmapear={onDesmapear}
              onContextItem={props.onContextItem}
              onContextNo={(e) => props.onContextNo(s.id, false, e)}
            />
          ))}
          <NovoSub onAdd={onAddSub} permiteRegime={props.permiteRegime} />
        </>
      )}
    </div>
  )
}

function Cabecalho({
  raiz,
  total,
  qtd,
  recolhido,
  onAlternar,
  onContextNo,
}: {
  raiz: No
  total: number
  qtd: number
  recolhido: boolean
  onAlternar: () => void
  onContextNo: (e: MouseEvent) => void
}) {
  const etiquetas = etiquetasContabeis(raiz.meta)
  return (
    <div
      className={`cursor-pointer px-4 py-3 ${recolhido ? '' : 'border-b border-bd'}`}
      onClick={onAlternar}
      onContextMenu={onContextNo}
      title="Clique para recolher/expandir · botão direito para mais ações"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          <span className="mr-1.5 inline-block text-xs text-muted">{recolhido ? '▸' : '▾'}</span>
          {raiz.nome}
        </span>
        <div className="flex items-center gap-3">
          {qtd > 0 ? (
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-muted">{qtd}</span>
          ) : null}
          <span className="font-bold tabular-nums">{brl(total)}</span>
        </div>
      </div>
      {!recolhido && etiquetas.length > 0 ? <Etiquetas tags={etiquetas} /> : null}
    </div>
  )
}

function Etiquetas({ tags }: { tags: readonly string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-medium text-secondary">
          {t}
        </span>
      ))}
    </div>
  )
}

function Subgrupo({
  no,
  itens,
  onSoltar,
  onRemover,
  onDesmapear,
  onContextItem,
  onContextNo,
}: {
  no: No
  itens: readonly ItemConc[]
  onSoltar: (chave: string) => void
  onRemover: () => void
  onDesmapear: (chave: string) => void
  onContextItem: (chave: string, e: MouseEvent) => void
  onContextNo: (e: MouseEvent) => void
}) {
  return (
    <DropZone onSoltar={onSoltar} className="mx-3 my-2 rounded-lg border border-bd/70 bg-surface2/40">
      <div
        className="flex items-center justify-between px-3 py-1.5"
        onContextMenu={onContextNo}
        title="Botão direito para renomear/desconciliar/remover"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-secondary">↳ {no.nome}</span>
          {no.meta?.regime && no.meta.regime !== 'ambos' ? (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
              {no.meta.regime === 'dre' ? 'Só DRE' : 'Só DFC'}
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-2">
          {itens.length > 0 ? <span className="text-xs text-muted">{itens.length}</span> : null}
          <span className="text-xs tabular-nums text-muted">{brl(totalCentavos(itens))}</span>
          <button type="button" onClick={onRemover} className="text-xs text-muted hover:text-danger">
            ✕
          </button>
        </div>
      </div>
      <ItensLista itens={itens} onDesmapear={onDesmapear} onContextItem={onContextItem} vazio="" />
    </DropZone>
  )
}

function NovoSub({ onAdd, permiteRegime }: { onAdd: (nome: string, regime?: RegimeDemo) => void; permiteRegime: boolean }) {
  const [valor, setValor] = useState('')
  const [regime, setRegime] = useState<RegimeDemo>('ambos')
  const adicionar = () => {
    onAdd(valor, permiteRegime ? regime : undefined)
    setValor('')
    setRegime('ambos')
  }
  return (
    <div className="flex gap-2 px-3 pb-3 pt-1">
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && adicionar()}
        placeholder="+ subgrupo"
        className="flex-1 rounded border border-bd bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
      />
      {permiteRegime ? (
        <select
          value={regime}
          onChange={(e) => setRegime(e.target.value as RegimeDemo)}
          title="Em quais demonstrações o subgrupo entra"
          className="rounded border border-bd bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
        >
          <option value="ambos">DRE + DFC</option>
          <option value="dre">Só DRE</option>
          <option value="dfc">Só DFC</option>
        </select>
      ) : null}
    </div>
  )
}
