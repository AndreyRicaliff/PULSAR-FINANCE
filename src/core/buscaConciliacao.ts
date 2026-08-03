/**
 * @file Busca de navegação da Matriz de Classificações: casa pelo título/código do item
 * OU pelo nome do grupo/subgrupo onde ele está conciliado — "embalagens" acha a conta E
 * tudo que caiu no grupo Embalagens. Núcleo puro; a UI só recorta a vista (KPIs e
 * progresso seguem sobre o conjunto inteiro).
 */
import type { No } from './modelo'
import { normalizarTexto } from './texto'

export function filtrarConciliacao<T extends { readonly chave: string; readonly titulo: string }>(
  itens: readonly T[],
  estrutura: readonly No[],
  mapa: Readonly<Record<string, string>>,
  busca: string,
): readonly T[] {
  const q = normalizarTexto(busca)
  // Código casa pela query CRUA: normalizar viraria '2.05' em '2 05' e nunca acharia a chave.
  const qCodigo = busca.trim().toLowerCase()
  if (!q && !qCodigo) return itens
  const nosQueCasam = new Set(
    q ? estrutura.filter((n) => normalizarTexto(n.nome).includes(q)).map((n) => n.id) : [],
  )
  return itens.filter(
    (i) =>
      (q !== '' && normalizarTexto(i.titulo).includes(q)) ||
      (qCodigo !== '' && i.chave.toLowerCase().includes(qCodigo)) ||
      nosQueCasam.has(mapa[i.chave] ?? ''),
  )
}
