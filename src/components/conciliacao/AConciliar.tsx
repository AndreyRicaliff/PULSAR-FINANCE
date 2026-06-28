/** @file Lista de itens pendentes da Matriz de Classificações: busca, chip de sugestão da matriz e aplicação em lote (sem ⚠). */
import { useMemo, useState, type MouseEvent } from 'react'
import type { Sugestao } from '@/core/matriz-classificacao'
import { PREMISSAS } from '@/core/matriz-classificacao'
import type { No } from '@/core/modelo'
import { brl } from '@/lib/money'
import { DropZone } from './DropZone.tsx'
import type { ItemConc } from './tipos'
import { filtrar, opcoesSelect, totalCentavos, type Opcao } from './util'

interface Props {
  readonly itens: readonly ItemConc[]
  readonly estrutura: readonly No[]
  readonly termo: string
  /** Motor da Matriz de Classificação AG — só na dimensão de contas. */
  readonly sugerir?: (titulo: string) => Sugestao | null
  readonly onMapear: (chave: string, noId: string) => void
  readonly onDesmapear: (chave: string) => void
  readonly onContextItem: (chave: string, e: MouseEvent) => void
}

export function AConciliar({ itens, estrutura, termo, sugerir, onMapear, onDesmapear, onContextItem }: Props) {
  const [busca, setBusca] = useState('')
  const opcoes = useMemo(() => opcoesSelect(estrutura), [estrutura])
  const filtrados = useMemo(() => filtrar(itens, busca), [itens, busca])
  const nomePorNo = useMemo(() => new Map(estrutura.map((n) => [n.id, n.nome])), [estrutura])
  const aplicaveis = useMemo(() => sugestoesLimpas(itens, sugerir), [itens, sugerir])

  return (
    <DropZone
      onSoltar={onDesmapear}
      className="flex flex-col gap-3 rounded-card border border-dashed border-bd p-1 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]"
    >
      <Topo total={itens.length} valor={totalCentavos(itens)} busca={busca} onBusca={setBusca} />
      {aplicaveis.length > 0 ? (
        <button
          type="button"
          onClick={() => aplicaveis.forEach((a) => onMapear(a.chave, a.noId))}
          title="Concilia de uma vez as sugestões da matriz SEM alerta de erro (R1–R11 continuam manuais). Reversível item a item."
          className="mx-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-primary/25"
        >
          Aplicar {aplicaveis.length} sugest{aplicaveis.length === 1 ? 'ão' : 'ões'} sem alerta
        </button>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-card border border-bd bg-surface">
        <Tabela
          itens={filtrados}
          opcoes={opcoes}
          sugerir={sugerir}
          nomePorNo={nomePorNo}
          onMapear={onMapear}
          onContextItem={onContextItem}
        />
      </div>
      <p className="px-3 pb-2 text-xs text-muted">Arraste {termo} para um grupo, ou use o seletor.</p>
    </DropZone>
  )
}

function Topo({
  total,
  valor,
  busca,
  onBusca,
}: {
  total: number
  valor: number
  busca: string
  onBusca: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 px-3 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">A conciliar ({total})</h2>
        <span className="text-xs tabular-nums text-muted">{brl(valor)} pendente</span>
      </div>
      <input
        value={busca}
        onChange={(e) => onBusca(e.target.value)}
        placeholder="Buscar por nome ou código…"
        className="w-full rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm outline-none placeholder:text-muted focus:border-primary"
      />
    </div>
  )
}

/** Pendentes cuja sugestão tem destino E nenhuma premissa de erro — únicas elegíveis ao lote. */
function sugestoesLimpas(
  itens: readonly ItemConc[],
  sugerir?: (titulo: string) => Sugestao | null,
): { chave: string; noId: string }[] {
  if (!sugerir) return []
  return itens.flatMap((i) => {
    const s = sugerir(i.titulo)
    return s?.noId && s.premissas.length === 0 ? [{ chave: i.chave, noId: s.noId }] : []
  })
}

interface PropsLinha {
  readonly opcoes: readonly Opcao[]
  readonly sugerir?: (titulo: string) => Sugestao | null
  readonly nomePorNo: ReadonlyMap<string, string>
  readonly onMapear: (chave: string, noId: string) => void
  readonly onContextItem: (chave: string, e: MouseEvent) => void
}

function Tabela({ itens, ...resto }: PropsLinha & { itens: readonly ItemConc[] }) {
  if (itens.length === 0) {
    return <p className="px-4 py-8 text-center text-muted">Nada aqui · arraste um item de volta para desfazer</p>
  }
  return (
    <table className="w-full text-sm">
      <tbody>
        {itens.map((i) => (
          <Linha key={i.chave} item={i} {...resto} />
        ))}
      </tbody>
    </table>
  )
}

function Linha({ item, opcoes, sugerir, nomePorNo, onMapear, onContextItem }: PropsLinha & { item: ItemConc }) {
  const sug = sugerir?.(item.titulo) ?? null
  return (
    <tr
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', item.chave)}
      onContextMenu={(e) => onContextItem(item.chave, e)}
      className="cursor-grab border-b border-bd/60 last:border-0 hover:bg-surface2/40 active:cursor-grabbing"
    >
      <td className="px-3 py-2">
        <div className="truncate">{item.titulo}</div>
        {item.qtd ? <div className="text-xs text-muted">{item.qtd} mov.</div> : null}
        {sug ? <ChipSugestao sug={sug} nomePorNo={nomePorNo} onAplicar={(noId) => onMapear(item.chave, noId)} /> : null}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted">{brl(item.valorCentavos)}</td>
      <td className="px-3 py-2">
        <Seletor opcoes={opcoes} onEscolher={(noId) => onMapear(item.chave, noId)} />
      </td>
    </tr>
  )
}

/** Sugestão da Matriz AG: clicar aplica; premissa R1–R11 vira alerta com tooltip. Nunca auto-aplica. */
function ChipSugestao({
  sug,
  nomePorNo,
  onAplicar,
}: {
  sug: Sugestao
  nomePorNo: ReadonlyMap<string, string>
  onAplicar: (noId: string) => void
}) {
  const noId = sug.noId
  const destino = noId ? nomePorNo.get(noId) : undefined
  const alerta = sug.premissas.map((p) => `${p}: ${PREMISSAS[p]}`).join('\n')
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {noId && destino ? (
        <button
          type="button"
          onClick={() => onAplicar(noId)}
          title={sug.nota ?? 'Sugestão da Matriz de Classificação AG — clique para aplicar'}
          className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-secondary hover:bg-primary/25"
        >
          {destino}
        </button>
      ) : null}
      {sug.premissas.length > 0 ? (
        <span title={`${alerta}${sug.nota ? `\n${sug.nota}` : ''}`} className="cursor-help text-[11px] text-warn">
          Atenção: {sug.premissas.join(' ')}
        </span>
      ) : null}
    </div>
  )
}

function Seletor({ opcoes, onEscolher }: { opcoes: readonly Opcao[]; onEscolher: (noId: string) => void }) {
  return (
    <select
      value=""
      onChange={(e) => e.target.value && onEscolher(e.target.value)}
      disabled={opcoes.length === 0}
      className="rounded border border-bd bg-surface2 px-2 py-1 text-xs outline-none focus:border-primary disabled:opacity-50"
    >
      <option value="">conciliar em…</option>
      {opcoes.map((o) => (
        <option key={o.id} value={o.id}>
          {o.rotulo}
        </option>
      ))}
    </select>
  )
}
