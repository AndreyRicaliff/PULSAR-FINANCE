/** @file Helpers puros da board de conciliação (itens por nó, totais, filtro, opções de select). */
import { opcoesDaEstrutura, type No, type OpcaoNo } from '@/core/modelo'
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
  const q = busca.trim().toLowerCase()
  if (!q) return [...itens]
  return itens.filter(
    (i) => i.titulo.toLowerCase().includes(q) || i.chave.toLowerCase().includes(q),
  )
}
