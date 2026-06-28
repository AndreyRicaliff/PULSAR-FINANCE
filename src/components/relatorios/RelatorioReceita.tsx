/** @file Receita líquida: evolução mensal, crescimento MoM/YoY e fontes de receita. */
import { useMemo } from 'react'
import { crescimento } from '@/core/serie'
import { movimentacaoMensal } from '@/lib/graficos'
import { brl, pctVariacao } from '@/lib/money'
import { fontesReceita } from '@/lib/relatorios'
import { separarNeutros } from '@/core/neutros'
import { useResultado, valorLinha } from '@/lib/useResultado'
import { BarrasMensais } from '../charts/BarrasMensais.tsx'
import { GraficoExpansivel } from '../charts/GraficoExpansivel.tsx'
import { KpiCard } from '../KpiCard.tsx'
import { TabelaValor } from './TabelaValor.tsx'

export function RelatorioReceita() {
  const { grupos, dre, movimentos: todosMovs, conc, serie } = useResultado()
  const movimentos = useMemo(() => separarNeutros(todosMovs, conc).operacionais, [todosMovs, conc])
  const rb = valorLinha(dre, 'dre_receita')
  const rl = valorLinha(dre, 'dre_receita_liq')
  const deducoes = valorLinha(dre, 'dre_deducoes')
  const fontes = useMemo(() => fontesReceita(grupos, rl), [grupos, rl])
  const mensal = useMemo(() => movimentacaoMensal(movimentos, conc), [movimentos, conc])
  const cresc = useMemo(() => crescimento(serie, 'entrada'), [serie])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Análise de Receita Líquida</h1>
        <p className="text-sm text-muted">Evolução, crescimento e fontes de receita · dado real da Omie</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard rotulo="Receita Bruta" valor={brl(rb)} cor="accent" nota="Σ grupos de receita do período" />
        <KpiCard rotulo="(–) Deduções" valor={brl(deducoes)} cor="warn" nota="Impostos sobre venda e devoluções" />
        <KpiCard rotulo="= Receita Líquida" valor={brl(rl)} cor="accent" nota="Receita Bruta − Deduções" />
        <KpiCard
          rotulo="Crescimento MoM"
          valor={pctVariacao(cresc.mom)}
          cor={cresc.mom !== null && cresc.mom < 0 ? 'danger' : 'secondary'}
          nota="Entradas: último mês vs anterior — Espec §7"
        />
        <KpiCard
          rotulo="Crescimento YoY"
          valor={pctVariacao(cresc.yoy)}
          cor={cresc.yoy !== null && cresc.yoy < 0 ? 'danger' : 'secondary'}
          nota="Entradas: último mês vs mesmo mês do ano anterior (— se histórico < 13 meses)"
        />
      </section>

      <GraficoExpansivel titulo="Movimentação mensal (entradas × saídas)">
        <BarrasMensais dados={mensal} />
      </GraficoExpansivel>

      <TabelaValor titulo="Fontes de receita" linhas={fontes} totalRotulo="Total de entradas" />

      <Pendente />
    </div>
  )
}

function Pendente() {
  return (
    <div className="rounded-card border border-dashed border-bd p-4">
      <p className="text-sm font-semibold">Mix por unidade de negócio · Drivers de crescimento</p>
      <p className="mt-1 text-sm text-muted">
        A arquitetura já lê <strong>departamento</strong> da Omie (campo do movimento + catálogo
        sincronizado), mas hoje quase nenhum título vem preenchido — quando o cliente classificar os
        títulos por departamento na Omie, o mix por unidade abre aqui sozinho. Drivers (volume, preço,
        mix, câmbio) seguem dependendo de fonte externa. Sem inventar número.
      </p>
    </div>
  )
}

