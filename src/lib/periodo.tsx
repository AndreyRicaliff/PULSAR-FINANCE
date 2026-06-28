/** @file Filtros do módulo de relatórios (período/regime/filial) — default sem filtro fora dele. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { FiltroFilial } from '@/core/filial'
import { hojeLocalIso, INTERVALO_TUDO, intervaloDoPreset, type Intervalo, type Preset, type Regime } from '@/core/periodo'
import { snapshotApresentacao } from './apresentacaoSnapshot'

interface PeriodoCtx {
  readonly intervalo: Intervalo
  readonly regime: Regime
  readonly preset: Preset
  readonly filial: FiltroFilial
  readonly definirPreset: (p: Preset) => void
  readonly definirCustom: (i: Intervalo) => void
  readonly definirRegime: (r: Regime) => void
  readonly definirFilial: (f: FiltroFilial) => void
}

const Ctx = createContext<PeriodoCtx | null>(null)

export function PeriodoProvider({ children }: { children: ReactNode }) {
  // No HTML exportado, abre já no período escolhido na criação; no app vivo, 'tudo'.
  const periodoSnap = snapshotApresentacao()?.periodo
  const seedIntervalo: Intervalo = periodoSnap?.inicio || periodoSnap?.fim ? { inicio: periodoSnap.inicio, fim: periodoSnap.fim } : INTERVALO_TUDO
  const [preset, setPreset] = useState<Preset>(seedIntervalo === INTERVALO_TUDO ? 'tudo' : 'custom')
  const [intervalo, setIntervalo] = useState<Intervalo>(seedIntervalo)
  const [regime, setRegime] = useState<Regime>('competencia')
  const [filial, setFilial] = useState<FiltroFilial>(null)
  const hojeIso = useMemo(() => hojeLocalIso(), [])

  const definirPreset = useCallback(
    (p: Preset) => {
      setPreset(p)
      if (p !== 'custom') setIntervalo(intervaloDoPreset(p, hojeIso))
    },
    [hojeIso],
  )
  const definirCustom = useCallback((i: Intervalo) => {
    setPreset('custom')
    setIntervalo(i)
  }, [])

  const valor = useMemo<PeriodoCtx>(
    () => ({ intervalo, regime, preset, filial, definirPreset, definirCustom, definirRegime: setRegime, definirFilial: setFilial }),
    [intervalo, regime, preset, filial, definirPreset, definirCustom],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

/** Controles do filtro — exige estar dentro do PeriodoProvider. */
export function usePeriodo(): PeriodoCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePeriodo precisa estar dentro de <PeriodoProvider>')
  return c
}

/** Para o pipeline: filtros correntes; sem provider, devolve "tudo" (não filtra nada). */
export function usePeriodoOpcional(): { intervalo: Intervalo; regime: Regime; filial: FiltroFilial } {
  const c = useContext(Ctx)
  return c
    ? { intervalo: c.intervalo, regime: c.regime, filial: c.filial }
    : { intervalo: INTERVALO_TUDO, regime: 'competencia', filial: null }
}
