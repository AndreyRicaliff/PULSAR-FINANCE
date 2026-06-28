import type { Categoria, Natureza } from '../../src/core/categoria.ts'
import type { OmieCategoria } from './schema.ts'

export function mapCategoria(raw: OmieCategoria): Categoria {
  return {
    codigo: raw.codigo,
    descricao: decodeHtml(raw.descricao),
    natureza: inferNatureza(raw),
    paiCodigo: raw.categoria_superior?.trim() || null,
    agrupadora: raw.totalizadora === 'S',
    ativa: raw.conta_inativa !== 'S',
    entraNoDre: raw.nao_exibir !== 'S',
  }
}

// A Omie não tem campo único de natureza — deriva de flags. Transferência tem
// precedência porque essas linhas também marcam conta_despesa.
function inferNatureza(raw: OmieCategoria): Natureza {
  if (raw.transferencia === 'S') return 'transferencia'
  if (raw.conta_receita === 'S') return 'receita'
  if (raw.conta_despesa === 'S') return 'despesa'
  return 'outra'
}

const ENTIDADES: Readonly<Record<string, string>> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
}

function decodeHtml(texto: string): string {
  return texto.replace(/&lt;|&gt;|&amp;|&quot;|&#39;/g, (e) => ENTIDADES[e] ?? e)
}
