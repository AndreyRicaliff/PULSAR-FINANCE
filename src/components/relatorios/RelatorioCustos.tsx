/** @file Análise de custos e despesas: breakdown dos grupos de saída e % da receita. */
import { useMemo } from 'react'
import { brl, pct } from '@/lib/money'
import { custosDetalhe } from '@/lib/relatorios'
import { useResultado, valorLinha } from '@/lib/useResultado'
import { Donut } from '../charts/Donut.tsx'
import { GraficoExpansivel } from '../charts/GraficoExpansivel.tsx'
import { KpiCard } from '../KpiCard.tsx'

export function RelatorioCustos() {
  const { grupos, dre } = useResultado()
  const rl = valorLinha(dre, 'dre_receita_liq')
  const linhas = useMemo(() => custosDetalhe(grupos, rl), [grupos, rl])
  const total = linhas.reduce((s, l) => s + l.valorCentavos, 0)
  const fatias = linhas.map((l) => ({ label: l.label, valorCentavos: l.valorCentavos }))

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Análise de Custos e Despesas</h1>
        <p className="text-sm text-muted">
          Breakdown dos grupos de saída · % sobre a Receita Líquida · valores crus da Omie
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo="Custos + Despesas" valor={brl(total)} cor="danger" />
        <KpiCard rotulo="% da Receita Líquida" valor={pct(total, rl)} cor="warn" />
        <KpiCard rotulo="Receita Líquida" valor={brl(rl)} cor="accent" />
      </section>

      {linhas.length === 0 ? (
        <Vazio />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GraficoExpansivel titulo="Composição" grande={<Donut fatias={fatias} tamanho={340} />} ampliarSvg={false}>
            <Donut fatias={fatias} />
          </GraficoExpansivel>
          <Tabela linhas={linhas} rl={rl} total={total} />
        </div>
      )}
    </div>
  )
}

function Tabela({ linhas, rl, total }: { linhas: ReturnType<typeof custosDetalhe>; rl: number; total: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-bd bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bd text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 text-left font-semibold">Grupo</th>
            <th className="px-4 py-2.5 text-right font-semibold">% Rec. Líq.</th>
            <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.label} className="border-b border-bd/40">
              <td className="px-4 py-2.5">{l.label}</td>
              <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted">{l.pctReceita}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-danger">{brl(l.valorCentavos)}</td>
            </tr>
          ))}
          <tr className="border-t border-bd bg-surface2/50 font-bold">
            <td className="px-4 py-2.5">Total</td>
            <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted">{pct(total, rl)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{brl(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Vazio() {
  return (
    <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
      Nada conciliado em grupos de custo/despesa — concilie em “Matriz de Classificações”.
    </p>
  )
}
