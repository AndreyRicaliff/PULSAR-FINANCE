/** @file Ramifica movimentos por eixos encadeados (contraparte→mês→…) para o drill-down. */
import type { Movimento } from '@/core/movimento'
import type { Resolvedor } from '@/core/override'
import { classificar, type Eixo } from './rotulos'

export interface NoMov {
  readonly chave: string
  readonly rotulo: string
  readonly totalCentavos: number
  readonly qtd: number
  /** Vazio na folha (último eixo da cadeia). */
  readonly filhos: readonly NoMov[]
  /** Preenchido só na folha. */
  readonly itens: readonly Movimento[]
}

/** Particiona os movimentos recursivamente seguindo a cadeia de eixos. 100% cru. */
export function ramificar(
  movs: readonly Movimento[],
  eixos: readonly Eixo[],
  resolvedor: Resolvedor,
): NoMov[] {
  const eixo = eixos[0]
  if (!eixo) return []
  const resto = eixos.slice(1)
  return agrupar(movs, eixo, resolvedor)
    .map(([chave, g]) => montarNo(chave, g.rotulo, g.itens, resto, resolvedor))
    .sort((a, b) => Math.abs(b.totalCentavos) - Math.abs(a.totalCentavos))
}

function montarNo(
  chave: string,
  rotulo: string,
  itens: Movimento[],
  resto: readonly Eixo[],
  resolvedor: Resolvedor,
): NoMov {
  const folha = resto.length === 0
  return {
    chave,
    rotulo,
    qtd: itens.length,
    totalCentavos: soma(itens),
    filhos: folha ? [] : ramificar(itens, resto, resolvedor),
    itens: folha ? itens : [],
  }
}

function agrupar(
  movs: readonly Movimento[],
  eixo: Eixo,
  resolvedor: Resolvedor,
): [string, { rotulo: string; itens: Movimento[] }][] {
  const acc = new Map<string, { rotulo: string; itens: Movimento[] }>()
  for (const m of movs) {
    const { chave, rotulo } = classificar(m, eixo, resolvedor)
    const g = acc.get(chave) ?? { rotulo, itens: [] }
    g.itens.push(m)
    acc.set(chave, g)
  }
  return [...acc.entries()]
}

export function soma(itens: readonly Movimento[]): number {
  return itens.reduce((a, m) => a + m.valorCentavos, 0)
}
