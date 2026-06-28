/** @file Capital de giro: títulos em aberto, aging e prazos médios (PMR/PMP/ciclo) do período. */
import { useMemo } from 'react'
import { diasDoPeriodo } from '@/core/periodo'
import { brl } from '@/lib/money'
import { aging, prazosMedios, totalAberto, type FaixaAging, type PrazosMedios } from '@/lib/relatorios'
import { separarNeutros } from '@/core/neutros'
import { useResultado, valorLinha } from '@/lib/useResultado'
import { KpiCard } from '../KpiCard.tsx'

export function RelatorioCapitalGiro() {
  const { movimentos: todosMovs, dre, grupos, periodo, conc } = useResultado()
  const movimentos = useMemo(() => separarNeutros(todosMovs, conc).operacionais, [todosMovs, conc])
  const hoje = useMemo(() => new Date(), [])
  const receber = useMemo(() => totalAberto(movimentos, 'R'), [movimentos])
  const pagar = useMemo(() => totalAberto(movimentos, 'P'), [movimentos])
  const agingR = useMemo(() => aging(movimentos, 'R', hoje), [movimentos, hoje])
  const agingP = useMemo(() => aging(movimentos, 'P', hoje), [movimentos, hoje])

  const prazos = useMemo(() => {
    const dias = diasDoPeriodo(movimentos, periodo.intervalo, periodo.regime)
    const compras = Math.abs(grupos.find((g) => g.id === 'custos_variaveis')?.totalCentavos ?? 0)
    return prazosMedios({ recebiveis: receber, pagaveis: pagar, receita: valorLinha(dre, 'dre_receita'), compras, dias })
  }, [movimentos, periodo, grupos, dre, receber, pagar])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Painel de Capital de Giro</h1>
        <p className="text-sm text-muted">
          Títulos em aberto, aging e prazos médios · cru da Omie · denominadores seguem o período
          filtrado ({prazos.dias} dias)
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo="Recebíveis em aberto" valor={brl(receber)} cor="accent" nota="Σ valor em aberto dos títulos de natureza R" />
        <KpiCard rotulo="Pagáveis em aberto" valor={brl(pagar)} cor="danger" nota="Σ valor em aberto dos títulos de natureza P" />
        <KpiCard rotulo="Saldo (R − P)" valor={brl(receber - pagar)} cor="primary" nota="Folga (ou aperto) de giro entre receber e pagar" />
      </section>

      <PrazosKpis p={prazos} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Aging titulo="Aging de recebíveis" faixas={agingR} />
        <Aging titulo="Aging de pagáveis" faixas={agingP} />
      </div>

      <Pendente />
    </div>
  )
}

function PrazosKpis({ p }: { p: PrazosMedios }) {
  const dia = (v: number | null) => (v === null ? '—' : `${v} dias`)
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard rotulo="PMR — Prazo Médio de Recebimento" valor={dia(p.pmr)} cor="secondary" nota={`(Recebíveis ÷ Receita do período) × ${p.dias} dias — Espec §7`} />
      <KpiCard rotulo="PMP — Prazo Médio de Pagamento" valor={dia(p.pmp)} cor="secondary" nota={`(Pagáveis ÷ Compras do período) × ${p.dias} dias — Espec §7`} />
      <KpiCard
        rotulo="Ciclo Financeiro (sem estoque)"
        valor={dia(p.ciclo)}
        cor={p.ciclo !== null && p.ciclo > 0 ? 'warn' : 'accent'}
        nota="PMR − PMP · positivo = você financia o cliente antes de receber"
      />
    </section>
  )
}

function Aging({ titulo, faixas }: { titulo: string; faixas: readonly FaixaAging[] }) {
  const total = faixas.reduce((s, f) => s + f.valorCentavos, 0)
  return (
    <div className="overflow-hidden rounded-card border border-bd bg-surface">
      <h2 className="border-b border-bd px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</h2>
      <table className="w-full text-sm">
        <tbody>
          {faixas.map((f) => (
            <tr key={f.faixa} className="border-b border-bd/40">
              <td className="px-4 py-2.5">{f.faixa}</td>
              <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted">{f.qtd ? `${f.qtd} tít.` : ''}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{brl(f.valorCentavos)}</td>
            </tr>
          ))}
          <tr className="border-t border-bd bg-surface2/50 font-bold">
            <td className="px-4 py-2.5">Total em aberto</td>
            <td />
            <td className="px-4 py-2.5 text-right tabular-nums">{brl(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Pendente() {
  return (
    <div className="rounded-card border border-dashed border-bd p-4">
      <p className="text-sm font-semibold">PME · CCC completo</p>
      <p className="mt-1 text-sm text-muted">
        O <strong>PME</strong> (prazo médio de estoque) exige dado de estoque, que não vem da Omie
        aqui — por isso o ciclo acima é o financeiro (PMR − PMP), sem a parcela de estoque. Com
        fonte de estoque, o CCC completo (PMR + PME − PMP) liga sem mudança de estrutura.
      </p>
    </div>
  )
}

