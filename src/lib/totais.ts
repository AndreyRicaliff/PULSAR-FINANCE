/**
 * @file Totais crus de um conjunto de movimentos (entradas/saídas/saldo pela natureza R/P)
 * + totais do mês corrente — base da faixa de contexto que compara escopo × mês ao lado.
 */
import { useMemo } from 'react'
import type { Movimento } from '@/core/movimento'
import {
  filtrarPorPeriodo,
  hojeLocalIso,
  intervaloDoPreset,
  type Intervalo,
  type Regime,
} from '@/core/periodo'
import type { Conciliacao } from '@/core/modelo'
import { separarNeutros } from '@/core/neutros'
import { useMovimentos } from './movimentos'

export interface TotaisMov {
  readonly entrada: number
  readonly saida: number
  readonly saldo: number
  readonly qtd: number
}

/** Soma crua por natureza (R = entrada, P = saída) — sem conciliação, sem inventar sinal. */
export function totaisDe(movs: readonly Movimento[]): TotaisMov {
  let entrada = 0
  let saida = 0
  for (const m of movs) {
    if (m.natureza.toUpperCase() === 'R') entrada += m.valorCentavos
    else saida += m.valorCentavos
  }
  return { entrada, saida, saldo: entrada - saida, qtd: movs.length }
}

export interface MesAtualTotais {
  readonly totais: TotaisMov
  readonly intervalo: Intervalo
  /** 'mm/aa' do mês corrente. */
  readonly rotulo: string
}

/** Totais do mês corrente no regime dado. Com `conc`, neutros (Regra Mãe) ficam fora. */
export function useTotaisMesAtual(regime: Regime, conc?: Conciliacao): MesAtualTotais {
  const { movimentos: todos } = useMovimentos()
  return useMemo(() => {
    const intervalo = intervaloDoPreset('mes-atual', hojeLocalIso())
    const base = filtrarPorPeriodo(todos, intervalo, regime).dentro
    const movs = conc ? separarNeutros(base, conc).operacionais : base
    const ini = intervalo.inicio ?? ''
    return { totais: totaisDe(movs), intervalo, rotulo: `${ini.slice(5, 7)}/${ini.slice(2, 4)}` }
  }, [todos, regime, conc])
}
