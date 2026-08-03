/**
 * @file Matriz mês a mês de uma demonstração (estilo "Resumo Financeiro" contábil):
 * uma coluna por mês + Total, com AV% (vertical, sobre a receita do próprio mês) e
 * AH% (horizontal, variação vs mês anterior). Mesmo pipeline do lado — a coluna Total
 * é o cálculo do intervalo inteiro, não a soma das colunas (bate por construção).
 * Linha clicável REVELA AS CONTAS (chaves efetivas) que a compõem, mês a mês, e o
 * botão ⤢ abre a matriz em TELA CHEIA (pedidos 02/08).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { LinhaCalc } from '@/core/demonstracao'
import type { Intervalo } from '@/core/periodo'
import type { MesComparativo } from '@/lib/useComparativo'
import { brl } from '@/lib/money'

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const rotuloMes = (i: Intervalo) =>
  i.inicio ? `${MES_CURTO[Number(i.inicio.slice(5, 7)) - 1]}/${i.inicio.slice(2, 4)}` : '—'

const pctTexto = (parte: number, base: number) => (base > 0 ? `${((parte / base) * 100).toFixed(1)}%` : '—')
const ahTexto = (v: number, ant: number | null) =>
  ant === null || ant === 0 ? '—' : `${(((v - ant) / Math.abs(ant)) * 100) >= 0 ? '+' : ''}${(((v - ant) / Math.abs(ant)) * 100).toFixed(1)}%`

interface Props {
  readonly titulo: string
  readonly meses: readonly MesComparativo[]
  readonly total: readonly LinhaCalc[]
  readonly tipo: 'dre' | 'dfc'
}

export function TabelaMeses({ titulo, meses, total, tipo }: Props) {
  const [cheia, setCheia] = useState(false)
  return (
    <>
      <Cartao titulo={titulo} onExpandir={() => setCheia(true)}>
        <Matriz meses={meses} total={total} tipo={tipo} />
      </Cartao>
      {cheia ? (
        <TelaCheia titulo={titulo} onFechar={() => setCheia(false)}>
          <Matriz meses={meses} total={total} tipo={tipo} />
        </TelaCheia>
      ) : null}
    </>
  )
}

function Cartao({ titulo, onExpandir, children }: { titulo: string; onExpandir: () => void; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border border-bd bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-bd px-4 py-3">
        <p className="text-sm font-semibold">{titulo}</p>
        <button
          type="button"
          onClick={onExpandir}
          title="Expandir em tela cheia"
          aria-label={`Expandir em tela cheia: ${titulo}`}
          className="fx-press grid h-7 w-7 shrink-0 place-items-center rounded-md border border-bd text-muted transition-colors hover:border-primary hover:text-text"
        >
          <IconeExpandir />
        </button>
      </div>
      {children}
      <Rodape />
    </div>
  )
}

/** Tela cheia própria (não o modal 6xl dos gráficos): matriz larga precisa da viewport inteira. */
function TelaCheia({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    // Esc fecha esta camada; se houver overlay abaixo (comparativo tela cheia), fecha junto —
    // aceito: X fecha só a matriz.
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-[60] overflow-auto bg-bg p-4 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="fx-press grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-bd text-muted transition-colors hover:border-danger hover:text-danger"
          >
            ✕
          </button>
        </div>
        <div className="overflow-hidden rounded-card border border-bd bg-surface">
          {children}
          <Rodape />
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface ContaLinha {
  readonly nome: string
  readonly valores: readonly number[]
}

function Matriz({ meses, total, tipo }: Omit<Props, 'titulo'>) {
  const colunas = useMemo(() => meses.map((m) => (tipo === 'dre' ? m.dre : m.dfc)), [meses, tipo])
  const bases = useMemo(
    () => colunas.map((c) => (tipo === 'dre' ? (c.find((l) => l.id === 'dre_receita')?.valorCentavos ?? 0) : 0)),
    [colunas, tipo],
  )
  const baseTotal = tipo === 'dre' ? (total.find((l) => l.id === 'dre_receita')?.valorCentavos ?? 0) : 0
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(new Set())

  // linhaId → contas (chaves efetivas) com os valores alinhados às colunas de mês.
  const contasPorLinha = useMemo(() => {
    const porLinha = new Map<string, Map<string, { nome: string; valores: number[] }>>()
    meses.forEach((m, i) => {
      for (const c of tipo === 'dre' ? m.chavesDre : m.chavesDfc) {
        const contas = porLinha.get(c.linha) ?? new Map<string, { nome: string; valores: number[] }>()
        const item = contas.get(c.chave) ?? { nome: c.nome, valores: new Array<number>(meses.length).fill(0) }
        item.valores[i] = (item.valores[i] ?? 0) + c.valorCentavos
        contas.set(c.chave, item)
        porLinha.set(c.linha, contas)
      }
    })
    const saida = new Map<string, ContaLinha[]>()
    for (const [linha, contas] of porLinha) {
      saida.set(
        linha,
        [...contas.values()].sort(
          (a, b) => Math.abs(b.valores.reduce((s, v) => s + v, 0)) - Math.abs(a.valores.reduce((s, v) => s + v, 0)),
        ),
      )
    }
    return saida
  }, [meses, tipo])

  const alternar = (id: string) =>
    setAbertas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-bd text-left text-[10px] uppercase tracking-wider text-muted">
          <tr>
            <th className="sticky left-0 bg-surface px-4 py-2.5">Descrição</th>
            {meses.map((m, i) => (
              <th key={m.intervalo.inicio ?? i} className="whitespace-nowrap px-3 py-2.5 text-right">
                {rotuloMes(m.intervalo)}
                <span className="block font-normal normal-case text-muted/60">AV% · AH%</span>
              </th>
            ))}
            <th className="whitespace-nowrap border-l border-bd px-4 py-2.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {total.map((linha, li) => {
            const subtotal = linha.tipo === 'subtotal'
            const contas = contasPorLinha.get(linha.id) ?? []
            const expansivel = !subtotal && contas.length > 0
            const aberta = abertas.has(linha.id)
            return (
              <LinhaMatriz
                key={linha.id}
                linha={linha}
                li={li}
                colunas={colunas}
                bases={bases}
                baseTotal={baseTotal}
                subtotal={subtotal}
                expansivel={expansivel}
                aberta={aberta}
                contas={aberta ? contas : []}
                onAlternar={() => alternar(linha.id)}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function LinhaMatriz({
  linha,
  li,
  colunas,
  bases,
  baseTotal,
  subtotal,
  expansivel,
  aberta,
  contas,
  onAlternar,
}: {
  linha: LinhaCalc
  li: number
  colunas: readonly (readonly LinhaCalc[])[]
  bases: readonly number[]
  baseTotal: number
  subtotal: boolean
  expansivel: boolean
  aberta: boolean
  contas: readonly ContaLinha[]
  onAlternar: () => void
}) {
  return (
    <>
      <tr className={subtotal ? 'bg-surface2/50 font-bold' : 'border-t border-bd/40'}>
        <td className="sticky left-0 max-w-[240px] bg-surface px-4 py-2" title={linha.nome}>
          {expansivel ? (
            <button
              type="button"
              onClick={onAlternar}
              aria-expanded={aberta}
              title={aberta ? 'Ocultar as contas desta linha' : 'Revelar as contas desta linha'}
              className="flex w-full items-center gap-1.5 text-left hover:text-text"
            >
              <span className={`text-[9px] text-muted transition-transform ${aberta ? 'rotate-90' : ''}`}>▸</span>
              <span className="truncate">{linha.nome}</span>
            </button>
          ) : (
            <span className="block truncate">{linha.nome}</span>
          )}
        </td>
        {colunas.map((col, ci) => {
          const v = col[li]?.valorCentavos ?? 0
          const ant = ci > 0 ? (colunas[ci - 1]?.[li]?.valorCentavos ?? 0) : null
          return (
            <td key={ci} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
              <span className={v < 0 ? 'text-danger' : ''}>{brl(v)}</span>
              <span className="block text-[10px] text-muted">
                {pctTexto(Math.abs(v), bases[ci] ?? 0)} · {ahTexto(v, ant)}
              </span>
            </td>
          )
        })}
        <td className="whitespace-nowrap border-l border-bd px-4 py-2 text-right tabular-nums">
          <span className={`font-semibold ${linha.valorCentavos < 0 ? 'text-danger' : ''}`}>
            {brl(linha.valorCentavos)}
          </span>
          <span className="block text-[10px] text-muted">{pctTexto(Math.abs(linha.valorCentavos), baseTotal)}</span>
        </td>
      </tr>
      {contas.map((c) => {
        const totalConta = c.valores.reduce((s, v) => s + v, 0)
        return (
          <tr key={c.nome} className="border-t border-bd/20 bg-surface2/20 text-xs text-muted">
            <td className="sticky left-0 max-w-[240px] truncate bg-surface2/20 py-1.5 pl-10 pr-4" title={c.nome}>
              ↳ {c.nome}
            </td>
            {c.valores.map((v, ci) => (
              <td key={ci} className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                {v !== 0 ? <span className={v < 0 ? 'text-danger/80' : ''}>{brl(v)}</span> : '–'}
              </td>
            ))}
            <td className="whitespace-nowrap border-l border-bd px-4 py-1.5 text-right font-medium tabular-nums">
              <span className={totalConta < 0 ? 'text-danger/80' : ''}>{brl(totalConta)}</span>
            </td>
          </tr>
        )
      })}
    </>
  )
}

function Rodape() {
  return (
    <p className="border-t border-bd px-4 py-2 text-[11px] text-muted">
      AV% = participação sobre a Receita Bruta do próprio mês · AH% = variação sobre o mês anterior ·
      Total = cálculo do intervalo inteiro · clique numa linha (▸) para revelar as contas
    </p>
  )
}

function IconeExpandir() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}
