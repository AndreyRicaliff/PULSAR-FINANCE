/** @file Renderiza o conteúdo real de uma seção (mesmos componentes do app) dentro de um slide. */
import { useMemo } from 'react'
import { separarNeutros } from '@/core/neutros'
import { useResultado } from '@/lib/useResultado'
import { IndicadoresPanel } from '../IndicadoresPanel.tsx'
import { RelatorioComparativo } from '../relatorios/RelatorioComparativo.tsx'
import { RelatorioDRE } from '../relatorios/RelatorioDRE.tsx'
import { RelatorioDFC } from '../relatorios/RelatorioDFC.tsx'
import { RelatorioCustos } from '../relatorios/RelatorioCustos.tsx'
import { RelatorioReceita } from '../relatorios/RelatorioReceita.tsx'
import { RelatorioCapitalGiro } from '../relatorios/RelatorioCapitalGiro.tsx'
import { RelatorioEvolucao } from '../relatorios/RelatorioEvolucao.tsx'
import { RelatorioFiliais } from '../relatorios/RelatorioFiliais.tsx'
import { RelatorioNeutros } from '../relatorios/RelatorioNeutros.tsx'
import { ProjecaoPanel } from '../ProjecaoPanel.tsx'
import type { SecaoSlideId } from './tipos'

export function ConteudoSecao({ secao }: { secao: SecaoSlideId }) {
  const { dre, dfc, grupos, movimentos, conc } = useResultado()
  const neutros = useMemo(() => separarNeutros(movimentos, conc).neutros, [movimentos, conc])

  switch (secao) {
    case 'dashboard':
      return <IndicadoresPanel resumo />
    case 'dre':
      return <RelatorioDRE dre={dre} grupos={grupos} />
    case 'dfc':
      return <RelatorioDFC dfc={dfc} />
    case 'evolucao':
      return <RelatorioEvolucao />
    case 'comparativo':
      return <RelatorioComparativo />
    case 'custos':
      return <RelatorioCustos />
    case 'receita':
      return <RelatorioReceita />
    case 'giro':
      return <RelatorioCapitalGiro />
    case 'previsto':
      return <ProjecaoPanel />
    case 'filiais':
      return <RelatorioFiliais />
    case 'neutros':
      return <RelatorioNeutros neutros={neutros} conc={conc} />
  }
}
