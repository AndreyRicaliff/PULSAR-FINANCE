/**
 * @file Estruturas EDITÁVEIS de DRE e DFC — separadas da estrutura geral (plano de contas).
 * Cada demonstração é uma lista ordenada de linhas (entrada recebe grupos; subtotal é soma
 * em cascata) + um mapa grupo-da-estrutura-geral → linha. O padrão (waterfall AG dos MDs)
 * apenas SEMEIA o mapa a partir das etiquetas; daí o cliente personaliza, sem sair do padrão.
 * Conforme Complemento_DEV_DRE_DFC §1 (DRE) e §2 (DFC).
 */
import type { AtividadeDFC, No, PapelDRE } from './modelo'

export type TipoDemo = 'dre' | 'dfc'

/** Override especial "fora desta demonstração": a chave não cai em nenhuma linha (removida). */
export const LINHA_FORA = '__fora__'

export type TipoLinha = 'entrada' | 'subtotal'

export interface LinhaDemo {
  readonly id: string
  readonly nome: string
  readonly tipo: TipoLinha
}

export interface Demonstracao {
  readonly linhas: readonly LinhaDemo[]
  /** grupoId (estrutura geral) → linhaId (entrada). */
  readonly mapa: Readonly<Record<string, string>>
  /** Override por subgrupo (id do nó) → linhaId. Precedência sobre o grupo. */
  readonly mapaSub?: Readonly<Record<string, string>>
  /** Override por classe (código da agrupadora Omie) → linhaId. Precedência máxima. */
  readonly mapaClasse?: Readonly<Record<string, string>>
}

const LINHAS_DRE: readonly LinhaDemo[] = [
  { id: 'dre_receita', nome: 'Receita Bruta', tipo: 'entrada' },
  { id: 'dre_deducoes', nome: '(–) Deduções e Impostos', tipo: 'entrada' },
  { id: 'dre_receita_liq', nome: '= Receita Líquida', tipo: 'subtotal' },
  { id: 'dre_custos', nome: '(–) Custos Variáveis', tipo: 'entrada' },
  { id: 'dre_mc', nome: '= Margem de Contribuição', tipo: 'subtotal' },
  { id: 'dre_despesas', nome: '(–) Despesas Operacionais', tipo: 'entrada' },
  { id: 'dre_ebitda', nome: '= EBITDA', tipo: 'subtotal' },
  { id: 'dre_depreciacao', nome: '(–) Depreciação e Amortização', tipo: 'entrada' },
  { id: 'dre_ebit', nome: '= EBIT (Resultado Operacional)', tipo: 'subtotal' },
  { id: 'dre_financeiro', nome: '(+/–) Resultado Financeiro', tipo: 'entrada' },
  { id: 'dre_tributos', nome: '(–) Tributos sobre o Lucro', tipo: 'entrada' },
  { id: 'dre_liquido', nome: '= Resultado Líquido', tipo: 'subtotal' },
]

const LINHAS_DFC: readonly LinhaDemo[] = [
  { id: 'dfc_op', nome: 'Fluxo Operacional', tipo: 'entrada' },
  { id: 'dfc_inv', nome: 'Fluxo de Investimento', tipo: 'entrada' },
  { id: 'dfc_fin', nome: 'Fluxo de Financiamento', tipo: 'entrada' },
  { id: 'dfc_var', nome: '= Variação de Caixa', tipo: 'subtotal' },
]

export const LINHAS_PADRAO: Readonly<Record<TipoDemo, readonly LinhaDemo[]>> = {
  dre: LINHAS_DRE,
  dfc: LINHAS_DFC,
}

const PAPEL_LINHA: Readonly<Record<PapelDRE, string>> = {
  receita_bruta: 'dre_receita',
  deducao: 'dre_deducoes',
  custo_variavel: 'dre_custos',
  despesa_operacional: 'dre_despesas',
  depreciacao: 'dre_depreciacao',
  resultado_financeiro: 'dre_financeiro',
  tributo_lucro: 'dre_tributos',
}

const ATIVIDADE_LINHA: Readonly<Record<AtividadeDFC, string>> = {
  operacional: 'dfc_op',
  investimento: 'dfc_inv',
  financiamento: 'dfc_fin',
}

function linhaPadraoDoGrupo(tipo: TipoDemo, no: No): string | undefined {
  const meta = no.meta
  if (!meta || meta.neutra) return undefined
  if (tipo === 'dre') return meta.papelDRE ? PAPEL_LINHA[meta.papelDRE] : undefined
  return meta.atividadeDFC ? ATIVIDADE_LINHA[meta.atividadeDFC] : undefined
}

/** Mapa padrão grupo→linha, semeado pelas etiquetas dos grupos da estrutura geral. */
export function mapaPadrao(tipo: TipoDemo, estruturaGeral: readonly No[]): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const no of estruturaGeral) {
    if (no.paiId) continue
    const linha = linhaPadraoDoGrupo(tipo, no)
    if (linha) mapa[no.id] = linha
  }
  return mapa
}

export function demonstracaoPadrao(tipo: TipoDemo, estruturaGeral: readonly No[]): Demonstracao {
  return { linhas: LINHAS_PADRAO[tipo], mapa: mapaPadrao(tipo, estruturaGeral) }
}

/** Ids dos grupos-raiz neutros (Regra Mãe) — nunca entram numa linha de DRE/DFC. */
export function idsNeutros(estruturaGeral: readonly No[]): Set<string> {
  return new Set(estruturaGeral.filter((n) => !n.paiId && n.meta?.neutra).map((n) => n.id))
}

/** Demonstração sem grupos neutros no mapa: garante que neutro fique sempre "a conciliar". */
export function semNeutros(demo: Demonstracao, neutros: ReadonlySet<string>): Demonstracao {
  if (!neutros.size) return demo
  const mapa = Object.fromEntries(Object.entries(demo.mapa).filter(([g]) => !neutros.has(g)))
  return { ...demo, mapa }
}

export interface PartidaNeutra {
  readonly id: string
  readonly nome: string
  readonly valorCentavos: number
}

/**
 * Nós neutros com o valor do período, para EXIBIR ao pé da DRE/DFC (pedido 06/08:
 * "sempre aparecer nos regimes mas sem interferir nos valores").
 *
 * Deliberadamente FORA de `calcular`: a garantia de não-interferência é estrutural, não
 * comportamental — quem soma a cascata nunca vê estas linhas, então nenhum bug futuro aqui
 * consegue mexer num total.
 *
 * Inclui SUBGRUPO neutro, e não só raiz: em produção (06/08) os neutros são 57 subgrupos —
 * "Transferência entre Contas Próprias", "Aplicação/Resgate D+0", "Estornos" — contra 15
 * raízes. Listar só raiz fazia sumir justamente o caso real. Subgrupo sob raiz JÁ neutra não
 * entra: o total do pai já o contém, e repetir seria contar duas vezes na mesma vista.
 */
export function partidasNeutras(
  estruturaGeral: readonly No[],
  totalPorNo: ReadonlyMap<string, number>,
): PartidaNeutra[] {
  const raizNeutra = new Set(estruturaGeral.filter((n) => !n.paiId && n.meta?.neutra).map((n) => n.id))
  const nomeRaiz = new Map(estruturaGeral.filter((n) => !n.paiId).map((n) => [n.id, n.nome]))
  return estruturaGeral
    .filter((n) => n.meta?.neutra && !(n.paiId && raizNeutra.has(n.paiId)))
    .map((n) => ({
      id: n.id,
      // Subgrupo qualificado pelo pai: "Transferência entre Contas Próprias" sozinho não
      // diz de onde saiu quando dois grupos têm subgrupo de mesmo nome.
      nome: n.paiId ? `${nomeRaiz.get(n.paiId) ?? '—'} · ${n.nome}` : n.nome,
      valorCentavos: totalPorNo.get(n.id) ?? 0,
    }))
}

export interface LinhaCalc extends LinhaDemo {
  readonly valorCentavos: number
  readonly gruposIds: readonly string[]
}

/** Calcula a demonstração: entrada soma os grupos alocados; subtotal é a soma em cascata. */
export function calcular(demo: Demonstracao, totalPorGrupo: ReadonlyMap<string, number>): LinhaCalc[] {
  let acumulado = 0
  return demo.linhas.map((l) => {
    if (l.tipo === 'subtotal') return { ...l, valorCentavos: acumulado, gruposIds: [] }
    const gruposIds = Object.keys(demo.mapa).filter((g) => demo.mapa[g] === l.id)
    const valorCentavos = gruposIds.reduce((a, g) => a + (totalPorGrupo.get(g) ?? 0), 0)
    acumulado += valorCentavos
    return { ...l, valorCentavos, gruposIds }
  })
}

/** Valor de uma linha calculada por id (0 se ausente). Helper puro, reusado em todo o app. */
export function valorLinha(linhas: readonly LinhaCalc[], id: string): number {
  return linhas.find((l) => l.id === id)?.valorCentavos ?? 0
}
