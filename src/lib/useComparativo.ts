/**
 * @file Demonstrações calculadas para janelas arbitrárias pelo MESMO pipeline do resultado
 * (período → espelho → DRE/DFC) — base do comparativo lado a lado e do mês corrente.
 */
import { useMemo } from 'react'
import { totaisEfetivos } from '@/core/classes'
import { calcular, type Demonstracao, type LinhaCalc } from '@/core/demonstracao'
import { filtrarPorFilial, mapaAuto } from '@/core/filial'
import { movimentosCaixa } from '@/core/movimento'
import { filtrarPorPeriodo, hojeLocalIso, intervaloDoPreset, type Intervalo, type Regime } from '@/core/periodo'
import { useCadastros } from './cadastros'
import { separarNeutros } from '@/core/neutros'
import { useMovimentos } from './movimentos'
import { usePeriodoOpcional } from './periodo'
import { espelhoEstrutura, type GrupoEspelho } from './resultado'
import { totaisDe, type TotaisMov } from './totais'
import { useDemonstracoes } from './useDemonstracoes'
import { useModelo } from './useModelo'

export interface MesAtual {
  readonly dre: readonly LinhaCalc[]
  readonly dfc: readonly LinhaCalc[]
  readonly intervalo: Intervalo
  readonly qtd: number
}

export interface LadoDemonstracoes {
  readonly dre: readonly LinhaCalc[]
  readonly dfc: readonly LinhaCalc[]
  readonly espelho: readonly GrupoEspelho[]
  readonly totais: TotaisMov
}

/** DRE/DFC + espelho de uma janela arbitrária (sem filial — visão geral do comparativo). */
export function useDemonstracoesDe(intervalo: Intervalo, regime: Regime): LadoDemonstracoes {
  const { modelo } = useModelo()
  const dem = useDemonstracoes()
  const { movimentos: todos } = useMovimentos()
  const { categorias } = useCadastros()
  const conc = modelo.contas
  const cats = categorias.categorias

  return useMemo(() => {
    const movs = filtrarPorPeriodo(todos, intervalo, regime).dentro
    const espelho = espelhoEstrutura(movs, conc)
    const ef = (movsArg: typeof movs, demo: Demonstracao, tipo: 'dre' | 'dfc') => {
      const e = totaisEfetivos(movsArg, conc, cats, demo, tipo)
      return calcular({ linhas: demo.linhas, mapa: e.mapaEfetivo }, e.totalPorChave)
    }
    return {
      dre: ef(movs, dem.demo.dre, 'dre'),
      dfc: ef(movimentosCaixa(movs), dem.demo.dfc, 'dfc'),
      espelho,
      totais: totaisDe(separarNeutros(movs, conc).operacionais),
    }
  }, [todos, intervalo, regime, conc, cats, dem.demo.dre, dem.demo.dfc])
}

/** DRE/DFC do mês corrente com regime e filial herdados do filtro ativo. */
export function useMesAtual(): MesAtual {
  const { modelo } = useModelo()
  const dem = useDemonstracoes()
  const { regime, filial } = usePeriodoOpcional()
  const { movimentos: todos } = useMovimentos()
  const { nomesContrapartes, categorias } = useCadastros()
  const conc = modelo.contas
  const cats = categorias.categorias

  return useMemo(() => {
    const intervalo = intervaloDoPreset('mes-atual', hojeLocalIso())
    const base = filtrarPorPeriodo(todos, intervalo, regime).dentro
    const auto = filial ? mapaAuto(todos, modelo.centros, nomesContrapartes) : new Map<string, string>()
    const movs = filtrarPorFilial(base, filial, modelo.centros, auto).dentro
    const ef = (movsArg: typeof movs, demo: Demonstracao, tipo: 'dre' | 'dfc') => {
      const e = totaisEfetivos(movsArg, conc, cats, demo, tipo)
      return calcular({ linhas: demo.linhas, mapa: e.mapaEfetivo }, e.totalPorChave)
    }
    return { dre: ef(movs, dem.demo.dre, 'dre'), dfc: ef(movimentosCaixa(movs), dem.demo.dfc, 'dfc'), intervalo, qtd: movs.length }
  }, [todos, regime, filial, modelo.centros, conc, cats, dem.demo.dre, dem.demo.dfc, nomesContrapartes])
}
