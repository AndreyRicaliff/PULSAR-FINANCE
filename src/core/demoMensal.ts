/**
 * @file Demonstração MENSAL: a DRE/DFC configurada recalculada mês a mês, como matriz
 * (linhas × meses) — base da análise vertical anual com todos os meses simultâneos.
 * Núcleo puro; mês ancorado pelo regime (mesma regra de toda a série do app).
 */
import type { Categoria } from './categoria'
import { totaisEfetivos } from './classes'
import { calcular, type Demonstracao, type TipoDemo } from './demonstracao'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import { dataDoMovimento, type Regime } from './periodo'

export interface LinhaMatriz {
  readonly nome: string
  readonly tipo: 'entrada' | 'subtotal'
  /** Um valor por mês, alinhado com `meses`. */
  readonly valores: readonly number[]
  readonly total: number
}

export interface MatrizDemo {
  /** 'aaaa-mm', ordenado. */
  readonly meses: readonly string[]
  readonly rotulos: readonly string[]
  readonly linhas: readonly LinhaMatriz[]
}

const rotuloMes = (m: string): string => `${m.slice(5, 7)}/${m.slice(2, 4)}`

/**
 * Matriz da demonstração mês a mês. Usa o MESMO motor do app (totaisEfetivos: overrides
 * classe > subgrupo > grupo), para a apresentação bater com a tela. Mês sem data no regime fica fora.
 */
export function demoMensal(
  movs: readonly Movimento[],
  conc: Conciliacao,
  demo: Demonstracao,
  regime: Regime,
  categorias: readonly Categoria[],
  tipo: TipoDemo,
): MatrizDemo {
  const porMes = new Map<string, Movimento[]>()
  for (const m of movs) {
    const iso = dataDoMovimento(m, regime)
    if (!iso) continue
    const mes = iso.slice(0, 7)
    const lista = porMes.get(mes) ?? []
    lista.push(m)
    porMes.set(mes, lista)
  }
  const meses = [...porMes.keys()].sort()
  const porLinha = new Map<string, number[]>()
  let nomes: { nome: string; tipo: 'entrada' | 'subtotal' }[] = []
  meses.forEach((mes, i) => {
    const ef = totaisEfetivos(porMes.get(mes) ?? [], conc, categorias, demo, tipo)
    const linhas = calcular({ linhas: demo.linhas, mapa: ef.mapaEfetivo }, ef.totalPorChave)
    if (i === 0) nomes = linhas.map((l) => ({ nome: l.nome, tipo: l.tipo }))
    linhas.forEach((l) => {
      const arr = porLinha.get(l.id) ?? new Array<number>(meses.length).fill(0)
      arr[i] = l.valorCentavos
      porLinha.set(l.id, arr)
    })
  })
  const ids = [...porLinha.keys()]
  return {
    meses,
    rotulos: meses.map(rotuloMes),
    linhas: ids.map((id, idx) => {
      const valores = porLinha.get(id) ?? []
      return { ...nomes[idx]!, valores, total: valores.reduce((a, v) => a + v, 0) }
    }),
  }
}
