/**
 * @file Provedor de dados do tenant (ERP de origem). O pipeline é agnóstico — só a COPY
 * da tela precisa do nome. Em português o gênero muda a preposição ("da Omie" / "do Nibo"),
 * então o rótulo é distribuído já contraído, não concatenado no ponto de uso.
 */
export type Provedor = 'omie' | 'nibo'

export interface RotulosProvedor {
  /** 'Omie' */
  readonly nome: string
  /** 'da Omie' — dados **da Omie** */
  readonly de: string
  /** 'na Omie' — rateado **na Omie** */
  readonly em: string
}

const ROTULOS: Readonly<Record<Provedor, RotulosProvedor>> = {
  omie: { nome: 'Omie', de: 'da Omie', em: 'na Omie' },
  nibo: { nome: 'Nibo', de: 'do Nibo', em: 'no Nibo' },
}

/** Cliente sem credencial cadastrada: não inventa nome de ERP. */
const GENERICO: RotulosProvedor = { nome: 'ERP', de: 'do ERP', em: 'no ERP' }

export function rotulosProvedor(provedor: string | null | undefined): RotulosProvedor {
  return ROTULOS[provedor as Provedor] ?? GENERICO
}

/**
 * Nem todo ERP expõe orçamento: o Omie tem módulo de orçamento de caixa (fonte da coluna
 * Previsto), o Nibo não tem equivalente. Sem isso a tela promete um dado que não existe.
 *
 * Nega só o que se SABE não ter — provedor desconhecido (ex.: HTML de apresentação exportado
 * antes desta coluna existir) cai no aviso brando "orçamento vazio", nunca numa afirmação
 * falsa de que o ERP não tem o módulo.
 */
export function temOrcamento(provedor: string | null | undefined): boolean {
  return provedor !== 'nibo'
}

/**
 * Interpola `{provedor}` / `{de}` / `{em}` em texto que nasce fora de componente
 * (tabelas de constantes: itens de menu, descrições de eixo, catálogo de relatórios).
 */
export function comProvedor(texto: string, rotulos: RotulosProvedor): string {
  const valor: Readonly<Record<string, string>> = {
    provedor: rotulos.nome,
    de: rotulos.de,
    em: rotulos.em,
  }
  return texto.replace(/\{(provedor|de|em)\}/g, (_, chave: string) => valor[chave] ?? '')
}
