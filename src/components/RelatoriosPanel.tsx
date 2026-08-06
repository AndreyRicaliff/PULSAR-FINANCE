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
import { RelatorioCapex } from './relatorios/RelatorioCapex.tsx'
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
  | 'capex'
  | 'apresentacao'

/**
 * Rótulos na nomenclatura contábil-financeira (pedido 06/08). Cada nome descreve o que a
 * vista CALCULA, não o que ela parece: o comparativo faz análise vertical e horizontal;
 * "Previsto × Realizado" lê o orçamento do ERP, então é execução orçamentária; filial com
 * receita E despesa é centro de RESULTADO, não centro de custo.
 *
 * DRE, DFC, CAPEX e Capital de Giro ficam como estão — já são o termo técnico; trocá-los
 * por sinônimo seria perder reconhecimento sem ganhar precisão.
 */
const VISTAS: readonly OpcaoSeg<VistaRel>[] = [
  { id: 'visao', rotulo: 'Catálogo', dica: 'Índice dos relatórios disponíveis, parciais e os que aguardam fonte de dado' },
  { id: 'dashboard', rotulo: 'Indicadores', dica: 'Indicadores-chave (KPIs) e gráficos derivados da DRE e da DFC' },
  { id: 'comparativo', rotulo: 'Comparativo AV/AH', dica: 'Análise vertical (% sobre a receita) e horizontal (variação entre períodos), linha a linha' },
  { id: 'evolucao', rotulo: 'Evolução & Tendência', dica: 'Série mensal contínua com projeção por tendência linear ou média móvel' },
  { id: 'dre', rotulo: 'DRE', dica: 'Demonstração do Resultado do Exercício — cascata, margens e análise vertical' },
  { id: 'dfc', rotulo: 'DFC', dica: 'Demonstração dos Fluxos de Caixa — variação de caixa por atividade (CPC 03)' },
  { id: 'custos', rotulo: 'Custos & Despesas', dica: 'Composição dos grupos de saída e representatividade sobre a receita líquida' },
  { id: 'receita', rotulo: 'Receita Líquida', dica: 'Receita bruta menos deduções: evolução mensal e fontes' },
  { id: 'filiais', rotulo: 'Centros de Resultado', dica: 'Receitas E despesas por filial / centro de custo — por isso resultado, não só custo' },
  { id: 'giro', rotulo: 'Capital de Giro', dica: 'Títulos em aberto, aging e prazos médios (PMR, PMP e ciclo financeiro)' },
  { id: 'previsto', rotulo: 'Execução Orçamentária', dica: 'Orçado (ERP) × realizável (títulos em aberto) × realizado (baixas), mês a mês' },
  { id: 'capex', rotulo: 'CAPEX', dica: 'Dispêndio de capital: expansão × reposição, com orçado × realizado' },
  { id: 'neutros', rotulo: 'Partidas Neutras', dica: 'Transferências, aportes e estornos (Regra Mãe) — fora de DRE, DFC e indicadores' },
  // 'apresentacao' saiu do menu: agora é a aba própria "Apresentações" (explorador).
  // O tipo/render ficam para o deep-link inicial="apresentacao" não quebrar.
]

export function RelatoriosPanel({ inicial = 'visao' }: { inicial?: VistaRel } = {}) {
  // O período vem do Shell (filtro global) — montar um provider aqui isolava a aba.
  return <Conteudo inicial={inicial} />
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
      {vista === 'capex' ? <RelatorioCapex /> : null}
      {vista === 'apresentacao' ? <RelatorioApresentacao /> : null}
    </div>
  )
}
