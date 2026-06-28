/** @file Átomos visuais do editor de demonstração: caret, nome expansível, lupa, seletor, alça, valores. */
import type { ReactNode } from 'react'
import { brl } from '@/lib/money'
import { LINHA_FORA, type LinhaCalc } from '@/core/demonstracao'

/** Indicador visual de expandido (o clique vive no nome inteiro, alvo grande). */
export function Caret({ aberto }: { aberto: boolean }) {
  return (
    <span className={`inline-block w-3 text-[10px] text-muted transition-transform duration-200 ${aberto ? 'rotate-90' : ''}`}>▸</span>
  )
}

/** Nome do grupo como alvo de clique grande para expandir/recolher (ou estático se sem drill). */
export function NomeExpansivel({ nome, tag, aberto, temDrill, onAlternar }: { nome: string; tag?: ReactNode; aberto: boolean; temDrill: boolean; onAlternar: () => void }) {
  const conteudo = (
    <>
      <span className="truncate">{nome}</span>
      {tag}
    </>
  )
  if (!temDrill) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-3" />
        {conteudo}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onAlternar}
      title="Ver subgrupos e classes do grupo"
      className="-my-1 -ml-1 flex w-full min-w-0 items-center gap-2 rounded py-1 pl-1 pr-2 text-left hover:bg-surface2/50"
    >
      <Caret aberto={aberto} />
      {conteudo}
    </button>
  )
}

/** Lupa de detalhe de uma classe/subgrupo (abre os movimentos). */
export function Lupa({ onClick, titulo }: { onClick: () => void; titulo: string }) {
  return (
    <button type="button" onClick={onClick} title={titulo} className="shrink-0 text-muted hover:text-secondary">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </button>
  )
}

/** Seletor de linha de override: vazio = segue acima; LINHA_FORA = removido desta demonstração. */
export function SeletorLinha({ valor, entradas, onTrocar }: { valor: string; entradas: readonly LinhaCalc[]; onTrocar: (v: string) => void }) {
  const cor =
    valor === LINHA_FORA ? 'border-danger/60 bg-danger/10 text-danger' : valor ? 'border-secondary/60 bg-secondary/10 text-secondary' : 'border-bd bg-surface2 text-muted'
  return (
    <select
      value={valor}
      onChange={(e) => onTrocar(e.target.value)}
      title="Mandar para uma linha (override), manter seguindo acima, ou remover desta demonstração"
      className={`shrink-0 rounded border px-1 py-0.5 text-[10px] outline-none focus:border-primary ${cor}`}
    >
      <option value="">segue acima</option>
      {entradas.map((l) => (
        <option key={l.id} value={l.id}>
          {l.nome}
        </option>
      ))}
      <option value={LINHA_FORA}>✕ remover daqui</option>
    </select>
  )
}

/** Alça de arraste dedicada (só ela é draggable → não rouba clique de lupa/select). */
export function Grip({ chave }: { chave: string }) {
  return (
    <span
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', chave)}
      title="Arraste para outra linha"
      className="shrink-0 cursor-grab text-muted/50 hover:text-muted active:cursor-grabbing"
      aria-hidden
    >
      ⠿
    </span>
  )
}

/** Valor editado + comparação com o padrão (riscado) e Δ quando diferem. */
export function Valores({ editado, padrao }: { editado: number; padrao: number }) {
  const delta = editado - padrao
  return (
    <span className="flex items-center gap-3 text-right tabular-nums">
      <span className={`font-semibold ${editado < 0 ? 'text-danger' : ''}`}>{brl(editado)}</span>
      {delta !== 0 ? (
        <>
          <span className="text-xs text-muted line-through">{brl(padrao)}</span>
          <span className="text-xs font-medium text-warn">Δ {brl(delta)}</span>
        </>
      ) : null}
    </span>
  )
}
