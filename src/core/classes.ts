/**
 * @file Árvore da estrutura em 4 camadas: grupo → subgrupo → classe (agrupadora Omie) →
 * movimentação. A "classe" é a agrupadora ancestral da categoria no plano de contas Omie;
 * o subgrupo é o nó da nossa conciliação. Alimenta o drill do editor de DRE/DFC.
 */
import { rotuloCategoria, type Categoria } from './categoria'
import { LINHA_FORA, type Demonstracao, type TipoDemo } from './demonstracao'
import { entraNaDemonstracao, type Conciliacao, type No } from './modelo'
import type { Movimento } from './movimento'

export interface ClasseNo {
  readonly codigo: string
  readonly nome: string
  readonly totalCentavos: number
}

export interface SubgrupoArvore {
  readonly id: string
  readonly nome: string
  readonly totalCentavos: number
  readonly classes: readonly ClasseNo[]
}

function comSinal(m: Movimento): number {
  return m.natureza.toUpperCase() === 'R' ? m.valorCentavos : -m.valorCentavos
}

/** Agrupadora ancestral (classe) da categoria; null se não houver agrupadora acima. */
export function classeDe(codigo: string, catPorCodigo: ReadonlyMap<string, Categoria>): Categoria | null {
  const folha = catPorCodigo.get(codigo)
  let pai = folha?.paiCodigo ? catPorCodigo.get(folha.paiCodigo) ?? null : null
  while (pai && !pai.agrupadora && pai.paiCodigo) pai = catPorCodigo.get(pai.paiCodigo) ?? null
  return pai?.agrupadora ? pai : null
}

interface Acum {
  nome: string
  total: number
  classes: Map<string, ClasseNo>
}

function chaveClasse(codigo: string, catPorCodigo: ReadonlyMap<string, Categoria>): ClasseNo {
  const classe = classeDe(codigo, catPorCodigo)
  if (classe) return { codigo: classe.codigo, nome: rotuloCategoria(classe.codigo, classe.descricao), totalCentavos: 0 }
  const folha = catPorCodigo.get(codigo)
  return { codigo, nome: folha ? rotuloCategoria(codigo, folha.descricao) : codigo, totalCentavos: 0 }
}

export const CHAVE_SUB = 'sub:'
export const CHAVE_CLASSE = 'cls:'

export interface TotaisEfetivos {
  /** chave (grupoId | sub:<id> | cls:<codigo>) → total no período. */
  readonly totalPorChave: Map<string, number>
  /** chave → linha da demonstração (precedência classe > subgrupo > grupo). */
  readonly mapaEfetivo: Record<string, string>
}

/**
 * Resolve cada movimento na chave/linha mais específica configurada: classe > subgrupo > grupo.
 * Mantém `calcular` intacto — a saída é consumida como (mapa, totalPorGrupo) de chaves efetivas.
 * Sem overrides, toda chave é o próprio grupoId → comportamento idêntico ao mapa de grupos.
 */
export function totaisEfetivos(
  movs: readonly Movimento[],
  conc: Conciliacao,
  categorias: readonly Categoria[],
  demo: Demonstracao,
  tipo: TipoDemo,
): TotaisEfetivos {
  const catPorCodigo = new Map(categorias.map((c) => [c.codigo, c]))
  const noPorId = new Map<string, No>(conc.estrutura.map((n) => [n.id, n]))
  const mapaSub = demo.mapaSub ?? {}
  const mapaClasse = demo.mapaClasse ?? {}
  const totalPorChave = new Map<string, number>()
  const mapaEfetivo: Record<string, string> = {}

  for (const m of movs) {
    const noId = conc.mapa[m.categoria]
    const no = noId ? noPorId.get(noId) : undefined
    if (!no) continue
    const grupoId = no.paiId ?? no.id
    // Regime do grupo E do subgrupo: se algum não entra nesta demonstração, o movimento fica de fora.
    if (!entraNaDemonstracao(noPorId.get(grupoId)?.meta, tipo)) continue
    if (no.paiId && !entraNaDemonstracao(no.meta, tipo)) continue
    const subId = no.paiId ? no.id : null
    const classe = classeDe(m.categoria, catPorCodigo)

    let chave = grupoId
    let linha: string | undefined = demo.mapa[grupoId]
    // Override só "conta" se mandar para uma linha DIFERENTE da efetiva acima — senão é
    // redundante (não cria chip "movido" duplicado quando se move para onde já está).
    if (subId && mapaSub[subId] !== undefined && mapaSub[subId] !== linha) {
      chave = `${CHAVE_SUB}${subId}`
      linha = mapaSub[subId]
    }
    if (classe && mapaClasse[classe.codigo] !== undefined && mapaClasse[classe.codigo] !== linha) {
      chave = `${CHAVE_CLASSE}${classe.codigo}`
      linha = mapaClasse[classe.codigo]
    }
    totalPorChave.set(chave, (totalPorChave.get(chave) ?? 0) + comSinal(m))
    // LINHA_FORA = removido desta demonstração: não entra em nenhuma linha.
    if (linha && linha !== LINHA_FORA) mapaEfetivo[chave] = linha
  }
  return { totalPorChave, mapaEfetivo }
}

/** grupoId → subgrupos (com suas classes e totais). Só nós com movimento entram. */
export function arvorePorGrupo(
  movs: readonly Movimento[],
  conc: Conciliacao,
  categorias: readonly Categoria[],
): Map<string, SubgrupoArvore[]> {
  const catPorCodigo = new Map(categorias.map((c) => [c.codigo, c]))
  const noPorId = new Map<string, No>(conc.estrutura.map((n) => [n.id, n]))
  // grupoId → subgrupoId → Acum
  const porGrupo = new Map<string, Map<string, Acum>>()

  for (const m of movs) {
    const noId = conc.mapa[m.categoria]
    const no = noId ? noPorId.get(noId) : undefined
    if (!no) continue
    const grupoId = no.paiId ?? no.id
    const subId = no.id
    const subs = porGrupo.get(grupoId) ?? new Map<string, Acum>()
    const acum = subs.get(subId) ?? { nome: no.nome, total: 0, classes: new Map() }
    acum.total += comSinal(m)
    const c = chaveClasse(m.categoria, catPorCodigo)
    const existente = acum.classes.get(c.codigo) ?? { ...c }
    acum.classes.set(c.codigo, { ...existente, totalCentavos: existente.totalCentavos + comSinal(m) })
    subs.set(subId, acum)
    porGrupo.set(grupoId, subs)
  }

  const saida = new Map<string, SubgrupoArvore[]>()
  for (const [grupoId, subs] of porGrupo) {
    const lista = [...subs.entries()].map(([id, a]) => ({
      id,
      nome: a.nome,
      totalCentavos: a.total,
      classes: [...a.classes.values()].sort((x, y) => Math.abs(y.totalCentavos) - Math.abs(x.totalCentavos)),
    }))
    saida.set(grupoId, lista.sort((x, y) => Math.abs(y.totalCentavos) - Math.abs(x.totalCentavos)))
  }
  return saida
}
