/** @file Fluxo de caixa por atividade: KPIs, waterfall e detalhamento expansível. */
import { useMemo } from 'react'
import type { LinhaCalc } from '@/core/demonstracao'
import { movimentosCaixa } from '@/core/movimento'
import { baixarCsv, csvDemonstracao } from '@/lib/exportar'
import { brl, fracVariacao } from '@/lib/money'
import { espelhoEstrutura } from '@/lib/resultado'
import { useCadastros } from '@/lib/cadastros'
import { useResultado, valorLinha } from '@/lib/useResultado'
import { KpiCard } from '../KpiCard.tsx'
import { TabelaDemonstracao } from '../TabelaDemonstracao.tsx'
import { useDetalheDemonstracao } from '../useDetalheDemonstracao.tsx'
import { GraficoExpansivel } from '../charts/GraficoExpansivel.tsx'
import { Waterfall, type PassoWF } from '../charts/Waterfall.tsx'

function tendenciaAbs(atual: number, ant?: number): number | undefined {
  const f = ant === undefined ? null : fracVariacao(atual, ant)
  return f === null ? undefined : Math.round(f * 100)
}

export function RelatorioDFC({ dfc }: { dfc: readonly LinhaCalc[] }) {
  const { movimentos, conc, anterior } = useResultado()
  const { categorias } = useCadastros()
  // DFC = caixa: drill e detalhe saem do PAGO (movimentosCaixa), igual às linhas — senão a
  // expansão vaza atrasado/a pagar (competência). Mesma regra do editor, para todo cliente.
  const movsCaixa = useMemo(() => movimentosCaixa(movimentos), [movimentos])
  const grupos = useMemo(() => espelhoEstrutura(movsCaixa, conc), [movsCaixa, conc])
  const detalhe = useDetalheDemonstracao(movsCaixa, conc, categorias.categorias)
  const op = valorLinha(dfc, 'dfc_op')
  const inv = valorLinha(dfc, 'dfc_inv')
  const fin = valorLinha(dfc, 'dfc_fin')
  const variacao = valorLinha(dfc, 'dfc_var')
  const opAnt = anterior ? valorLinha(anterior.dfc, 'dfc_op') : undefined
  const invAnt = anterior ? valorLinha(anterior.dfc, 'dfc_inv') : undefined
  const finAnt = anterior ? valorLinha(anterior.dfc, 'dfc_fin') : undefined
  const variacaoAnt = anterior ? valorLinha(anterior.dfc, 'dfc_var') : undefined

  const passos: PassoWF[] = [
    { rotulo: 'Operacional', valor: op, tipo: 'delta' },
    { rotulo: 'Investimento', valor: inv, tipo: 'delta' },
    { rotulo: 'Financiamento', valor: fin, tipo: 'delta' },
    { rotulo: 'Variação', valor: variacao, tipo: 'total' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Fluxo de Caixa</h1>
          <p className="text-sm text-muted">
            Variação de caixa por atividade (regime caixa · só liquidado) · operacional, investimento e
            financiamento
          </p>
        </div>
        <button
          type="button"
          onClick={() => baixarCsv('dfc.csv', csvDemonstracao(dfc))}
          className="fx-press rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm hover:border-primary"
        >
          Exportar CSV
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard rotulo="Operacional (CFO)" valor={brl(op)} cor={op >= 0 ? 'accent' : 'danger'} nota="Caixa gerado/consumido pela operação (receitas − custos − despesas)" tendencia={tendenciaAbs(op, opAnt)} />
        <KpiCard rotulo="Investimento (CFI)" valor={brl(inv)} cor={inv >= 0 ? 'accent' : 'danger'} nota="CAPEX, aplicações e resgates — só o principal" tendencia={tendenciaAbs(inv, invAnt)} />
        <KpiCard rotulo="Financiamento (CFF)" valor={brl(fin)} cor={fin >= 0 ? 'accent' : 'danger'} nota="Empréstimos, aportes/retiradas e distribuição de lucros" tendencia={tendenciaAbs(fin, finAnt)} />
        <KpiCard rotulo="Variação de Caixa" valor={brl(variacao)} cor="primary" nota="CFO + CFI + CFF" tendencia={tendenciaAbs(variacao, variacaoAnt)} />
      </section>

      <GraficoExpansivel titulo="Caixa por atividade · positivo acima, negativo abaixo do eixo">
        <Waterfall passos={passos} />
      </GraficoExpansivel>

      <TabelaDemonstracao titulo="Detalhamento por atividade" linhas={dfc} grupos={grupos} anterior={anterior?.dfc} onDetalhar={detalhe.detalhar} />
      {detalhe.modal}
    </div>
  )
}
