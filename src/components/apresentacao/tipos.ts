/** @file Tipos e catálogo (leve) dos slides da apresentação: seções de dado + slides livres. */

/** Seções do app que podem virar slide (exclui o catálogo 'visao' e a própria 'apresentacao'). */
export const SECOES_SLIDE = [
  { id: 'dashboard', rotulo: 'Indicadores' },
  { id: 'dre', rotulo: 'DRE — Resultado' },
  { id: 'dfc', rotulo: 'DFC — Fluxo de Caixa' },
  { id: 'evolucao', rotulo: 'Evolução Mensal' },
  { id: 'comparativo', rotulo: 'Comparativo' },
  { id: 'custos', rotulo: 'Custos' },
  { id: 'receita', rotulo: 'Receita' },
  { id: 'giro', rotulo: 'Capital de Giro' },
  { id: 'previsto', rotulo: 'Projeção (Previsto × Realizado)' },
  { id: 'filiais', rotulo: 'Filiais / Centro de Custo' },
  { id: 'neutros', rotulo: 'Movimentos Neutros' },
] as const

export type SecaoSlideId = (typeof SECOES_SLIDE)[number]['id']

/** Slide de uma seção de dado: argumento rico no topo + componente real + observação no rodapé. */
export interface SlideSecao {
  readonly tipo: 'secao'
  readonly secao: SecaoSlideId
  /** Rótulo customizado do slide (vazio = usa o rótulo padrão da seção). */
  readonly titulo?: string
  /** HTML rico do argumento (topo · até ~20 linhas). */
  readonly argumento: string
  /** Texto da observação (rodapé · até ~5 linhas). */
  readonly observacao: string
}

/** Slide livre: só título + argumento rico em página inteira (sem componente de dado). */
export interface SlideLivre {
  readonly tipo: 'livre'
  readonly id: string
  readonly titulo: string
  readonly argumento: string
  /** Anexo (imagem) embutido como data URL — aparece no slide; viaja offline no HTML. */
  readonly anexo?: string
}

export type SlideItem = SlideSecao | SlideLivre

export interface CapaConfig {
  readonly titulo: string
  readonly subtitulo: string
  readonly elaboradoPor: string
}

export interface FaixaMesesRel {
  readonly de: string | null  // 'aaaa-mm'
  readonly ate: string | null
}

export interface EstadoApresentacao {
  readonly capa: CapaConfig
  /** Slides na ordem do slideshow (mistura seções de dado e slides livres). */
  readonly roteiro: readonly SlideItem[]
  /** Período escolhido para o relatório exportado (vazio = todo o período). */
  readonly periodo: FaixaMesesRel
}

export const ROTULO_SECAO: Readonly<Record<SecaoSlideId, string>> = Object.fromEntries(
  SECOES_SLIDE.map((s) => [s.id, s.rotulo]),
) as Record<SecaoSlideId, string>

/** Roteiro padrão (segue o storyboard da AG): introdução → demonstrações → análises → texto livre. */
export const ROTEIRO_PADRAO: readonly SlideItem[] = [
  { tipo: 'secao', secao: 'receita', titulo: 'Introdução Executiva', argumento: '', observacao: '' },
  { tipo: 'secao', secao: 'dfc', argumento: '', observacao: '' },
  { tipo: 'secao', secao: 'evolucao', argumento: '', observacao: '' },
  { tipo: 'secao', secao: 'previsto', titulo: 'Projeção', argumento: '', observacao: '' },
  { tipo: 'secao', secao: 'dre', argumento: '', observacao: '' },
  { tipo: 'secao', secao: 'custos', argumento: '', observacao: '' },
  { tipo: 'livre', id: 'livre-1', titulo: '', argumento: '' },
  { tipo: 'secao', secao: 'dashboard', titulo: 'Indicadores — Resumo', argumento: '', observacao: '' },
  { tipo: 'livre', id: 'livre-2', titulo: 'Análise dos Cartões de Crédito', argumento: '' },
  { tipo: 'livre', id: 'livre-3', titulo: '', argumento: '' },
]
