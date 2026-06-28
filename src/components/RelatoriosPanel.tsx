/** @file Casco do módulo de relatórios: PeriodoProvider + navegação entre as vistas. */
import { useMemo, useState } from 'react'
import { separarNeutros } from '@/core/neutros'
import { rotuloIntervalo } from '@/core/periodo'
import { PeriodoProvider } from '@/lib/periodo'
import { useResultado } from '@/lib/useResultado'
import { ResumoPeriodo } from './ResumoPeriodo.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'
import { Catalogo } from './relatorios/Catalogo.tsx'
import { FiltroPeriodo } from './relatorios/FiltroPeriodo.tsx'
import { RelatorioComparativo } from './relatorios/RelatorioComparativo.tsx'
import { RelatorioDRE } from './relatorios/RelatorioDRE.tsx'
import { RelatorioDFC } from './relatorios/RelatorioDFC.tsx'
import { RelatorioCustos } from './relatorios/RelatorioCustos.tsx'
import { RelatorioReceita } from './relatorios/RelatorioReceita.tsx'
import { RelatorioCapitalGiro } from './relatorios/RelatorioCapitalGiro.tsx'
import { RelatorioEvolucao } from './relatorios/RelatorioEvolucao.tsx'
import { RelatorioFiliais } from './relatorios/RelatorioFiliais.tsx'
import { RelatorioApresentacao } from './relatorios/RelatorioApresentacao.tsx'
import { RelatorioNeutros } from './relatorios/RelatorioNeutros.tsx'
import { RelatorioPrevistoRealizado } from './relatorios/RelatorioPrevistoRealizado.tsx'
import { IndicadoresPanel } from './IndicadoresPanel.tsx'

export type VistaRel =
  | 'visao'
  | 'dashboard'
  | 'comparativo'
  | 'evolucao'
  | 'dre'
  | 'dfc'
  | 'custos'
  | 'receita'
  | 'filiais'
  | 'giro'
  | 'neutros'
  | 'previsto'
  | 'apresentacao'

const VISTAS: readonly OpcaoSeg<VistaRel>[] = [
  { id: 'visao', rotulo: 'Visão Geral' },
  { id: 'dashboard', rotulo: 'Dashboard' },
  { id: 'comparativo', rotulo: 'Comparativo' },
  { id: 'evolucao', rotulo: 'Evolução' },
  { id: 'dre', rotulo: 'DRE' },
  { id: 'dfc', rotulo: 'Fluxo de Caixa' },
  { id: 'custos', rotulo: 'Custos' },
  { id: 'receita', rotulo: 'Receita' },
  { id: 'filiais', rotulo: 'Filiais' },
  { id: 'giro', rotulo: 'Capital de Giro' },
  { id: 'previsto', rotulo: 'Previsto × Realizado' },
  { id: 'neutros', rotulo: 'Neutros' },
  { id: 'apresentacao', rotulo: 'Apresentação' },
]

export function RelatoriosPanel({ inicial = 'visao' }: { inicial?: VistaRel } = {}) {
  return (
    <PeriodoProvider>
      <Conteudo inicial={inicial} />
    </PeriodoProvider>
  )
}

function Conteudo({ inicial }: { inicial: VistaRel }) {
  const [vista, setVista] = useState<VistaRel>(inicial)
  const { dre, dfc, grupos, periodo, movimentos, conc } = useResultado()
  // Relatórios mostram só o operacional; neutros (Regra Mãe) ganham relatório próprio.
  const { operacionais, neutros } = useMemo(() => separarNeutros(movimentos, conc), [movimentos, conc])

  return (
    <div className="flex flex-col gap-6">
      <Segmento opcoes={VISTAS} valor={vista} onTrocar={setVista} />
      {vista !== 'visao' ? (
        <>
          <FiltroPeriodo info={periodo} />
          <ResumoPeriodo
            contexto="periodo"
            rotulo={`Visualizando ${rotuloIntervalo(periodo.intervalo)} · regime ${periodo.regime}${neutros.length ? ` · ${neutros.length} neutros fora` : ''}`}
            movimentos={operacionais}
            regime={periodo.regime}
            conc={conc}
          />
        </>
      ) : null}
      {vista === 'visao' ? <Catalogo onAbrir={setVista} /> : null}
      {vista === 'dashboard' ? <IndicadoresPanel /> : null}
      {vista === 'comparativo' ? <RelatorioComparativo /> : null}
      {vista === 'evolucao' ? <RelatorioEvolucao /> : null}
      {vista === 'dre' ? <RelatorioDRE dre={dre} grupos={grupos} /> : null}
      {vista === 'dfc' ? <RelatorioDFC dfc={dfc} /> : null}
      {vista === 'custos' ? <RelatorioCustos /> : null}
      {vista === 'receita' ? <RelatorioReceita /> : null}
      {vista === 'filiais' ? <RelatorioFiliais /> : null}
      {vista === 'giro' ? <RelatorioCapitalGiro /> : null}
      {vista === 'neutros' ? <RelatorioNeutros neutros={neutros} conc={conc} /> : null}
      {vista === 'previsto' ? <RelatorioPrevistoRealizado /> : null}
      {vista === 'apresentacao' ? <RelatorioApresentacao /> : null}
    </div>
  )
}
