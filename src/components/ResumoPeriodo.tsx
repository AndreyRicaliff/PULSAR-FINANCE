/**
 * @file Faixa de contexto de período: torna inconfundível o ESCOPO dos dados da aba —
 * âmbar = sem recorte (modelagem/conciliação/painel) · roxo = período selecionado (relatórios) —
 * sempre com o total do escopo e o total do mês corrente lado a lado.
 */
import { useMemo, useState } from 'react'
import type { Conciliacao } from '@/core/modelo'
import type { Movimento } from '@/core/movimento'
import type { Regime } from '@/core/periodo'
import { useMovimentos } from '@/lib/movimentos'
import { brl } from '@/lib/money'
import { totaisDe, useTotaisMesAtual, type TotaisMov } from '@/lib/totais'
import { ComparativoTelaCheia } from './ComparativoTelaCheia.tsx'

interface Props {
  /** Descrição do escopo: 'Conciliando: todos os lançamentos' / 'Período: 01/01/2026 – 30/06/2026'. */
  readonly rotulo: string
  readonly contexto: 'sem-recorte' | 'periodo'
  /** Movimentos do escopo — default: todos (seed completo, caso da modelagem). */
  readonly movimentos?: readonly Movimento[]
  readonly regime?: Regime
  /** Com conc, o lado "mês atual" também exclui neutros — consistência com o escopo filtrado. */
  readonly conc?: Conciliacao
}

export function ResumoPeriodo({ rotulo, contexto, movimentos, regime = 'competencia', conc }: Props) {
  const { movimentos: todos } = useMovimentos()
  const movs = movimentos ?? todos
  const escopo = useMemo(() => totaisDe(movs), [movs])
  const mes = useTotaisMesAtual(regime, conc)
  const [comparando, setComparando] = useState(false)
  const semRecorte = contexto === 'sem-recorte'

  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border px-4 py-2.5 text-xs ${
        semRecorte ? 'border-warn/40 bg-warn/5' : 'border-primary/40 bg-primary/5'
      }`}
    >
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          semRecorte ? 'bg-warn/15 text-warn' : 'bg-primary/15 text-secondary'
        }`}
      >
        {semRecorte ? 'Sem recorte' : 'Período'}
      </span>
      <span className="font-medium text-muted">{rotulo}</span>
      <span className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1">
        <BlocoTotais titulo={`Total do escopo · ${escopo.qtd} lançamentos`} t={escopo} />
        <span className="hidden h-6 w-px bg-bd sm:block" aria-hidden />
        <BlocoTotais titulo={`Mês atual ${mes.rotulo} · ${mes.totais.qtd} lançamentos`} t={mes.totais} />
        <button
          type="button"
          onClick={() => setComparando(true)}
          className="fx-sheen fx-press rounded-lg bg-gradient-to-r from-primary to-secondary px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          ⇆ Comparativo
        </button>
      </span>
      {comparando ? <ComparativoTelaCheia onFechar={() => setComparando(false)} /> : null}
    </div>
  )
}

function BlocoTotais({ titulo, t }: { titulo: string; t: TotaisMov }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted/80">{titulo}</span>
      <span className="flex gap-3 tabular-nums">
        <span className="text-accent">▲ {brl(t.entrada)}</span>
        <span className="text-danger">▼ {brl(t.saida)}</span>
        <span className={`font-semibold ${t.saldo < 0 ? 'text-danger' : 'text-text'}`}>= {brl(t.saldo)}</span>
      </span>
    </span>
  )
}
