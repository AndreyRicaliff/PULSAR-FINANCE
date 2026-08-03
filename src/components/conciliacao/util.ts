/** @file Helpers puros da board de conciliação (itens por nó, totais, filtro, opções de select). */
import { opcoesDaEstrutura, type No, type OpcaoNo } from '@/core/modelo'
import { normalizarTexto } from '@/core/texto'
import type { ItemConc } from './tipos'

export function itensDoNo(
  noId: string,
  mapa: Readonly<Record<string, string>>,
  porChave: ReadonlyMap<string, ItemConc>,
): ItemConc[] {
  return Object.keys(mapa)
    .filter((c) => mapa[c] === noId)
    .map((c) => porChave.get(c))
    .filter((i): i is ItemConc => i !== undefined)
    .sort((a, b) => b.valorCentavos - a.valorCentavos)
}

export function totalCentavos(itens: readonly ItemConc[]): number {
  return itens.reduce((a, i) => a + i.valorCentavos, 0)
}

export type Opcao = OpcaoNo

export const opcoesSelect = opcoesDaEstrutura

export function filtrar(itens: readonly ItemConc[], busca: string): ItemConc[] {
  // Padrão dual (UX 03/08): título dobra acento/caixa; chave/código casa cru.
  const q = normalizarTexto(busca)
  const qChave = busca.trim().toLowerCase()
  if (!q && !qChave) return [...itens]
  return itens.filter(
    (i) => (q !== '' && normalizarTexto(i.titulo).includes(q)) || (qChave !== '' && i.chave.toLowerCase().includes(qChave)),
  )
}
