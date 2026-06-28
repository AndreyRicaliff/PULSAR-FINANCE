/**
 * @file Normalização de texto para casamentos por nome (matriz de classificação,
 * filial↔contraparte): minúsculas, sem acento (NFKD cobre º→o), pontuação vira espaço.
 */
export function normalizarTexto(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
