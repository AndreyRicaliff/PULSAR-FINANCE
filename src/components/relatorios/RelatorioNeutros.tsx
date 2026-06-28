/**
 * @file Relatório de movimentos neutros (Regra Mãe): transferências, aportes e estornos.
 * Eles NÃO entram em DRE, DFC, gráficos nem indicadores — aqui é a trilha de auditoria.
 */
import { useMemo } from 'react'
import type { Conciliacao } from '@/core/modelo'
import type { Movimento } from '@/core/movimento'
import { brl } from '@/lib/money'
import { KpiCard } from '../KpiCard.tsx'

interface Props {
  readonly neutros: readonly Movimento[]
  readonly conc: Conciliacao
}

export function RelatorioNeutros({ neutros, conc }: Props) {
  const nomes = useMemo(() => new Map(conc.estrutura.map((n) => [n.id, n.nome])), [conc.estrutura])
  const entradas = useMemo(() => soma(neutros, 'R'), [neutros])
  const saidas = useMemo(() => soma(neutros, 'P'), [neutros])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Movimentos Neutros</h1>
        <p className="text-sm text-muted">
          Transferências, aportes e estornos classificados como <strong>neutros</strong> (Regra Mãe) ·
          ficam fora de DRE, DFC, gráficos e indicadores — este relatório existe para auditá-los
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo="Lançamentos neutros" valor={String(neutros.length)} cor="secondary" nota="No período selecionado" />
        <KpiCard rotulo="Entradas neutras" valor={brl(entradas)} cor="accent" nota="Natureza R — ex.: transferência recebida" />
        <KpiCard rotulo="Saídas neutras" valor={brl(saidas)} cor="danger" nota="Natureza P — ex.: transferência enviada" />
      </section>

      {neutros.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
          Nenhum movimento neutro no período — nada classificado em grupos da Regra Mãe.
        </p>
      ) : (
        <Tabela neutros={neutros} nomes={nomes} mapa={conc.mapa} />
      )}
    </div>
  )
}

function soma(movs: readonly Movimento[], natureza: 'R' | 'P'): number {
  return movs
    .filter((m) => m.natureza.toUpperCase() === natureza)
    .reduce((s, m) => s + Math.abs(m.valorCentavos), 0)
}

function Tabela({
  neutros,
  nomes,
  mapa,
}: {
  readonly neutros: readonly Movimento[]
  readonly nomes: ReadonlyMap<string, string>
  readonly mapa: Readonly<Record<string, string>>
}) {
  return (
    <div className="max-h-[32rem] overflow-auto rounded-card border border-bd">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Data</th>
            <th className="px-4 py-2 font-medium">Documento</th>
            <th className="px-4 py-2 font-medium">Contraparte</th>
            <th className="px-4 py-2 font-medium">Grupo neutro</th>
            <th className="px-4 py-2 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {neutros.map((m) => (
            <tr key={`${m.idTitulo}|${m.documento}|${m.data}|${m.valorCentavos}`} className="border-t border-bd/50">
              <td className="px-4 py-2 tabular-nums">{m.data || '—'}</td>
              <td className="px-4 py-2">{m.documento || '—'}</td>
              <td className="px-4 py-2">{m.contraparte || '—'}</td>
              <td className="px-4 py-2 text-muted">{nomes.get(mapa[m.categoria] ?? '') ?? '—'}</td>
              <td className={`px-4 py-2 text-right font-semibold tabular-nums ${m.natureza.toUpperCase() === 'R' ? 'text-accent' : 'text-danger'}`}>
                {m.natureza.toUpperCase() === 'R' ? '+' : '−'}
                {brl(Math.abs(m.valorCentavos))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
