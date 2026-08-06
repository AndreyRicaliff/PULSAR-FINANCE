/**
 * @file Módulo 4 — padronização (nossa organização financeira própria).
 * Genérico para várias DIMENSÕES (contas, fornecedores), cada uma com estrutura em até
 * 2 níveis (grupo → subgrupo) e o de-para do dado cru → estrutura. Conciliação manual;
 * valores fluem 100% crus.
 *
 * Cada nó de CONTAS carrega `meta` contábil (papel na DRE + atividade na DFC + neutra/
 * intercompany). É a fonte única da qual se derivam, no módulo 5, a DRE e a DFC.
 * As definições do plano padrão vivem em ./plano-padrao.
 * Alinhado a Especificacao_Sistema_PainelAG_DEV §4.3/§5.1 e
 * Complemento_DEV_DRE_DFC_Depreciacao_AG §1, §2, §7.
 */
import { SEM_FILIAL } from './centros'
import { ESTRUTURA_PADRAO_AG, ESTRUTURA_PADRAO_FORNECEDORES } from './plano-padrao'

export { ESTRUTURA_PADRAO_AG, ESTRUTURA_PADRAO_FORNECEDORES } from './plano-padrao'

/** Papel da conta na DRE (ausente = não entra na DRE). */
export type PapelDRE =
  | 'receita_bruta'
  | 'deducao'
  | 'custo_variavel'
  | 'despesa_operacional'
  | 'depreciacao'
  | 'resultado_financeiro'
  | 'tributo_lucro'

/** Atividade da conta na DFC (ausente = não entra na DFC, salvo se neutra). */
export type AtividadeDFC = 'operacional' | 'investimento' | 'financiamento'

/** Regimes em que o GRUPO entra. Ausente = ambos (compat). */
/**
 * 'neutro' é o quarto estado do seletor da Matriz (pedido 06/08): o grupo continua VISÍVEL
 * nas duas demonstrações, como partida informativa, mas fica fora de toda soma. É o único
 * jeito de marcar neutro pela UI — antes só o plano padrão nascia com `neutra`.
 * Invariante: `regime === 'neutro'` ⟺ `neutra === true` (definirRegime mantém os dois em par).
 */
export type RegimeDemo = 'dre' | 'dfc' | 'ambos' | 'neutro'

/** Balde do indicador de CAPEX: expansão (investimento) × reposição/conservação (manutenção). */
export type TipoCapex = 'investimento' | 'manutencao'

export interface MetaContabil {
  readonly papelDRE?: PapelDRE
  readonly atividadeDFC?: AtividadeDFC
  /** Regra Mãe: movimento que não é resultado nem caixa real (fora de DRE e DFC). */
  readonly neutra?: boolean
  /** Operação entre empresas do mesmo grupo — eliminada no consolidado. */
  readonly intercompany?: boolean
  /** Em quais demonstrações o grupo entra (escolhido na Matriz). Ausente = ambos. */
  readonly regime?: RegimeDemo
  /** Marca o nó no indicador de CAPEX (por empresa, via Matriz). Chave AUSENTE = nunca
   * decidido (migração pode aplicar o padrão); `null` = opt-out EXPLÍCITO (respeitado). */
  readonly capex?: TipoCapex | null
}

/**
 * O grupo SOMA na demonstração `tipo`? (regime ausente = ambos). Neutro nunca soma — nem por
 * `regime: 'neutro'`, nem pelo `neutra` da Regra Mãe. Aparecer é outra pergunta: ver
 * `partidasNeutras` (core/demonstracao), que lista o que é exibido sem entrar na conta.
 */
export function entraNaDemonstracao(meta: MetaContabil | undefined, tipo: 'dre' | 'dfc'): boolean {
  if (meta?.neutra) return false
  const r = meta?.regime ?? 'ambos'
  return r === 'ambos' || r === tipo
}

/** Demonstrações que um nó (e as categorias sob ele) alimenta — meta própria OU herdada da raiz. */
export function demonstracoesDoNo(
  meta: MetaContabil | undefined,
  metaRaiz: MetaContabil | undefined,
): { readonly dre: boolean; readonly dfc: boolean; readonly neutra: boolean } {
  const efetiva = meta ?? metaRaiz
  const neutra = efetiva?.neutra ?? false
  return {
    neutra,
    dre: !neutra && entraNaDemonstracao(efetiva, 'dre'),
    dfc: !neutra && entraNaDemonstracao(efetiva, 'dfc'),
  }
}

export interface No {
  readonly id: string
  readonly nome: string
  /** null = grupo (raiz); preenchido = subgrupo. Máx. 2 níveis. */
  readonly paiId: string | null
  /** Só preenchido na dimensão de contas. */
  readonly meta?: MetaContabil
}

export interface Conciliacao {
  readonly estrutura: readonly No[]
  readonly mapa: Readonly<Record<string, string>>
}

export interface Modelo {
  readonly contas: Conciliacao
  readonly fornecedores: Conciliacao
  /** Centros de custo / filiais — itens conciliáveis são CONTRAPARTES (cliente/fornecedor → filial). */
  readonly centros: Conciliacao
}

export type Dimensao = keyof Modelo

export const ROTULO_PAPEL_DRE: Readonly<Record<PapelDRE, string>> = {
  receita_bruta: 'Receita',
  deducao: 'Dedução',
  custo_variavel: 'Custo variável',
  despesa_operacional: 'Despesa op.',
  depreciacao: 'Depreciação',
  resultado_financeiro: 'Result. financeiro',
  tributo_lucro: 'Tributo s/ lucro',
}

export const ROTULO_ATIVIDADE_DFC: Readonly<Record<AtividadeDFC, string>> = {
  operacional: 'Operacional',
  investimento: 'Investimento',
  financiamento: 'Financiamento',
}

/** Etiquetas curtas legíveis para exibir o papel contábil de um nó. */
export const ROTULO_REGIME: Readonly<Record<RegimeDemo, string>> = {
  ambos: 'DRE + DFC',
  dre: 'Só DRE',
  dfc: 'Só DFC',
  neutro: 'Neutro (aparece, não soma)',
}

export const ROTULO_CAPEX: Readonly<Record<TipoCapex, string>> = {
  investimento: 'Investimento',
  manutencao: 'Manutenção',
}

export function etiquetasContabeis(meta?: MetaContabil): string[] {
  if (!meta) return ['DRE + DFC']
  if (meta.neutra) return ['Neutra · Regra Mãe']
  const tags: string[] = [ROTULO_REGIME[meta.regime ?? 'ambos']]
  if (meta.papelDRE) tags.push(`DRE · ${ROTULO_PAPEL_DRE[meta.papelDRE]}`)
  if (meta.atividadeDFC) tags.push(`DFC · ${ROTULO_ATIVIDADE_DFC[meta.atividadeDFC]}`)
  if (meta.capex) tags.push(`CAPEX · ${ROTULO_CAPEX[meta.capex]}`)
  if (meta.intercompany) tags.push('Intercompany')
  return tags
}

// Centros: fallback puro (só "Sem filial"); a estrutura real vem do seed de departamentos
// e é injetada na camada lib (useModelo) — core não importa dados.
export interface OpcaoNo {
  readonly id: string
  readonly rotulo: string
}

/** Estrutura achatada (grupo → subgrupo indentado) para selects de destino. */
/** Move o grupo-raiz `id` para `novoIndice` e renumera os nomes (número = posição). Filhos intactos. */
export function reordenarRaiz(estrutura: readonly No[], id: string, novoIndice: number): No[] {
  const raiz = estrutura.filter((n) => !n.paiId)
  const filhos = estrutura.filter((n) => n.paiId)
  const atual = raiz.findIndex((n) => n.id === id)
  if (atual < 0) return [...estrutura]
  const destino = Math.max(0, Math.min(novoIndice, raiz.length - 1))
  const nova = [...raiz]
  const [item] = nova.splice(atual, 1)
  nova.splice(destino, 0, item!)
  const renumerados = nova.map((n, i) => ({ ...n, nome: `${i + 1}. ${n.nome.replace(/^\d+\.\s*/, '')}` }))
  return [...renumerados, ...filhos]
}

export function opcoesDaEstrutura(estrutura: readonly No[]): OpcaoNo[] {
  return estrutura
    .filter((n) => !n.paiId)
    .flatMap((r) => [
      { id: r.id, rotulo: r.nome },
      ...estrutura.filter((n) => n.paiId === r.id).map((s) => ({ id: s.id, rotulo: `↳ ${s.nome}` })),
    ])
}

export const ESTRUTURA_PADRAO: Readonly<Record<Dimensao, readonly No[]>> = {
  contas: ESTRUTURA_PADRAO_AG,
  fornecedores: ESTRUTURA_PADRAO_FORNECEDORES,
  centros: [SEM_FILIAL],
}

export const MODELO_PADRAO: Modelo = {
  contas: { estrutura: ESTRUTURA_PADRAO_AG, mapa: {} },
  fornecedores: { estrutura: ESTRUTURA_PADRAO_FORNECEDORES, mapa: {} },
  centros: { estrutura: [SEM_FILIAL], mapa: {} },
}
