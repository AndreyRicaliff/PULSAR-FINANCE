/**
 * @file Camada de EDIÇÃO (não-destrutiva). Separa o dado cru do Omie (GET, imutável)
 * do que a equipe AG ajusta (PUT local). O app inteiro consome a PROJEÇÃO
 * (cru + override aplicado) via {@link Resolvedor} — o "GET pós PUT". Os resultados
 * (conciliação, DRE/DFC) saem do editado, nunca corrompendo o original. Spec §9.
 */
export type EntidadeEditavel = 'categoria' | 'contraparte' | 'titulo'

export interface Overrides {
  /** código da categoria → nome ajustado pela AG. */
  readonly categoria: Readonly<Record<string, string>>
  /** código do cliente/fornecedor → nome ajustado pela AG. */
  readonly contraparte: Readonly<Record<string, string>>
  /** id do título (nCodTitulo) → rótulo/apelido dado pela AG. */
  readonly titulo: Readonly<Record<string, string>>
}

export const OVERRIDES_VAZIO: Overrides = { categoria: {}, contraparte: {}, titulo: {} }

export interface NomeResolvido {
  /** O que exibir: ajustado se houver, senão o original do Omie. */
  readonly nome: string
  /** Sempre o nome original do Omie. */
  readonly original: string
  readonly editado: boolean
}

export interface Resolvedor {
  categoria(codigo: string): NomeResolvido
  contraparte(codigo: string): NomeResolvido
  /** Título não tem nome no cadastro: o original (ex.: nº do documento) vem do chamador. */
  titulo(id: string, original: string): NomeResolvido
}
