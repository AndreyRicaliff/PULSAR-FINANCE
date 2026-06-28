/** @file DRE com análise vertical, margens e drill-down por grupo/subgrupo. */
import type { LinhaCalc } from '@/core/demonstracao'
import { baixarCsv, csvDemonstracao } from '@/lib/exportar'
import { brl, pct } from '@/lib/money'
import type { GrupoEspelho } from '@/lib/resultado'
import { useCadastros } from '@/lib/cadastros'
import { useResultado, valorLinha } from '@/lib/useResultado'
import { KpiCard } from '../KpiCard.tsx'
import { TabelaDemonstracao } from '../TabelaDemonstracao.tsx'
import { useDetalheDemonstracao } from '../useDetalheDemonstracao.tsx'
import { GraficoExpansivel } from '../charts/GraficoExpansivel.tsx'
import { Waterfall, type PassoWF } from '../charts/Waterfall.tsx'

export function RelatorioDRE({ dre, grupos }: { dre: readonly LinhaCalc[]; grupos: readonly GrupoEspelho[] }) {
  const { movimentos, conc, anterior } = useResultado()
  const { categorias } = useCadastros()
  const detalhe = useDetalheDemonstracao(movimentos, conc, categorias.categorias)
  const rb = valorLinha(dre, 'dre_receita')
  const rl = valorLinha(dre, 'dre_receita_liq')
  const mc = valorLinha(dre, 'dre_mc')
  const ebitda = valorLinha(dre, 'dre_ebitda')
  const liquido = valorLinha(dre, 'dre_liquido')
  const rlAnt = anterior ? valorLinha(anterior.dre, 'dre_receita_liq') : undefined
  const mcAnt = anterior ? valorLinha(anterior.dre, 'dre_mc') : undefined
  const ebitdaAnt = anterior ? valorLinha(anterior.dre, 'dre_ebitda') : undefined
  const liquidoAnt = anterior ? valorLinha(anterior.dre, 'dre_liquido') : undefined

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">DRE — Resultado do Exercício</h1>
          <p className="text-sm text-muted">
            Cascata da DRE configurada · análise vertical (% da Receita Bruta) · valores crus da Omie, sinal
            pela natureza · neutros e não conciliados fora
          </p>
        </div>
        <button
          type="button"
          onClick={() => baixarCsv('dre.csv', csvDemonstracao(dre))}
          className="fx-press rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm hover:border-primary"
        >
          Exportar CSV
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo="Margem Bruta" valor={pct(mc, rl)} cor="primary" nota="Margem de Contribuição ÷ Receita Líquida" tendencia={tendenciaRatio(mc, rl, mcAnt, rlAnt)} />
        <KpiCard rotulo="Margem EBITDA" valor={pct(ebitda, rl)} cor="secondary" nota="EBITDA ÷ Receita Líquida" tendencia={tendenciaRatio(ebitda, rl, ebitdaAnt, rlAnt)} />
        <KpiCard rotulo="Margem Líquida" valor={pct(liquido, rl)} cor={liquido >= 0 ? 'primary' : 'danger'} nota="Resultado Líquido ÷ Receita Líquida" tendencia={tendenciaRatio(liquido, rl, liquidoAnt, rlAnt)} />
      </section>

      <Escada dre={dre} liquido={liquido} />
      <TabelaDemonstracao linhas={dre} grupos={grupos} base={rb} anterior={anterior?.dre} onDetalhar={detalhe.detalhar} />
      <Insights rl={rl} ebitda={ebitda} liquido={liquido} />
      {detalhe.modal}
    </div>
  )
}

/** % de variação do ratio v/base vs ratioAnt/baseAnt. Retorna undefined se base zero ou sem anterior. */
function tendenciaRatio(v: number, base: number, vAnt?: number, baseAnt?: number): number | undefined {
  if (vAnt === undefined || baseAnt === undefined || base === 0 || baseAnt === 0) return undefined
  const r = v / base
  const rAnt = vAnt / baseAnt
  if (rAnt === 0) return undefined
  return Math.round(((r - rAnt) / Math.abs(rAnt)) * 100)
}

/** Modelo em escada: cada degrau é uma linha de entrada da DRE; o total fecha no líquido. */
function Escada({ dre, liquido }: { dre: readonly LinhaCalc[]; liquido: number }) {
  const degrau = (id: string, rotulo: string): PassoWF => ({ rotulo, valor: valorLinha(dre, id), tipo: 'delta' })
  const todos: PassoWF[] = [
    degrau('dre_receita', 'Receita'),
    degrau('dre_deducoes', 'Deduções'),
    degrau('dre_custos', 'Custos'),
    degrau('dre_despesas', 'Despesas'),
    degrau('dre_depreciacao', 'Deprec.'),
    degrau('dre_financeiro', 'Financeiro'),
    degrau('dre_tributos', 'Tributos'),
    { rotulo: 'Líquido', valor: liquido, tipo: 'total' },
  ]
  const passos = todos.filter((p) => p.tipo === 'total' || p.valor !== 0)
  return (
    <GraficoExpansivel titulo="Resultado por etapa · positivo acima, negativo abaixo do eixo">
      <Waterfall passos={passos} />
    </GraficoExpansivel>
  )
}

function Insights({ rl, ebitda, liquido }: { rl: number; ebitda: number; liquido: number }) {
  const itens = [
    `Receita Líquida de ${brl(rl)}.`,
    `EBITDA de ${brl(ebitda)} (margem ${pct(ebitda, rl)}).`,
    `Resultado Líquido ${liquido >= 0 ? 'positivo' : 'negativo'} de ${brl(liquido)} (margem ${pct(liquido, rl)}).`,
  ]
  return (
    <div className="rounded-card border border-bd bg-surface p-4">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Leitura do período</p>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        {itens.map((t) => (
          <li key={t}>• {t}</li>
        ))}
      </ul>
    </div>
  )
}
