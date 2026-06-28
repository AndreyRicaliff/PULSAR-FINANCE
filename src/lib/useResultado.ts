/** @file Fonte única do resultado: movimentos filtrados por período E filial → espelho → DRE/DFC → série. */
import { useMemo } from 'react'
import { totaisEfetivos } from '@/core/classes'
import { calcular, type Demonstracao, type LinhaCalc } from '@/core/demonstracao'
import { filtrarPorFilial, mapaAuto, type FiltroFilial } from '@/core/filial'
import type { Conciliacao } from '@/core/modelo'
import { movimentosCaixa, type Movimento } from '@/core/movimento'
import {
  coberturaDatas,
  filtrarPorPeriodo,
  intervaloAnterior,
  type Cobertura as CoberturaData,
  type Intervalo,
  type Regime,
} from '@/core/periodo'
import { serieMensal, type PontoSerie } from '@/core/serie'
import { useCadastros } from './cadastros'
import { useMovimentos } from './movimentos'
import { usePeriodoOpcional } from './periodo'
import { cobertura, espelhoEstrutura, type Cobertura, type GrupoEspelho } from './resultado'
import { useDemonstracoes } from './useDemonstracoes'
import { useModelo } from './useModelo'

export interface InfoPeriodo {
  readonly intervalo: Intervalo
  readonly regime: Regime
  readonly dentro: number
  readonly fora: number
  readonly total: number
  readonly coberturaData: CoberturaData
  readonly filial: FiltroFilial
  /** Movimentos do período excluídos por serem de OUTRA filial (transparência do filtro). */
  readonly foraFilial: number
}

export interface DemonstracoesAnteriores {
  readonly dre: readonly LinhaCalc[]
  readonly dfc: readonly LinhaCalc[]
}

export interface Resultado {
  readonly movimentos: readonly Movimento[]
  readonly conc: Conciliacao
  readonly grupos: readonly GrupoEspelho[]
  readonly totalPorGrupo: ReadonlyMap<string, number>
  readonly dre: readonly LinhaCalc[]
  readonly dfc: readonly LinhaCalc[]
  /** DRE/DFC do período imediatamente anterior (mesma duração e filtros) — null com janela aberta. */
  readonly anterior: DemonstracoesAnteriores | null
  readonly cob: Cobertura
  readonly serie: readonly PontoSerie[]
  /** Série mensal COMPLETA (todos os meses), independente do período — relatórios contínuos
   *  (Evolução/tendência) usam esta; o filtro de período só recorta DRE/DFC e totais. */
  readonly serieContinua: readonly PontoSerie[]
  readonly periodo: InfoPeriodo
}

/** Pipeline único do resultado do cliente ativo: filtro de período → espelho → DRE/DFC → série. */
export function useResultado(): Resultado {
  const { modelo } = useModelo()
  const dem = useDemonstracoes()
  const { intervalo, regime, filial } = usePeriodoOpcional()
  const { movimentos: todos } = useMovimentos()
  const { nomesContrapartes, categorias } = useCadastros()
  const conc = modelo.contas
  const cats = categorias.categorias

  const filtro = useMemo(() => filtrarPorPeriodo(todos, intervalo, regime), [todos, intervalo, regime])
  // Herança calculada sobre TODOS os movimentos (mesmo critério do detalhamento) — estável vs período.
  const auto = useMemo(
    () => (filial ? mapaAuto(todos, modelo.centros, nomesContrapartes) : new Map<string, string>()),
    [todos, filial, modelo.centros, nomesContrapartes],
  )
  const filtroFilial = useMemo(
    () => filtrarPorFilial(filtro.dentro, filial, modelo.centros, auto),
    [filtro, filial, modelo.centros, auto],
  )
  const movimentos = filtroFilial.dentro

  const grupos = useMemo(() => espelhoEstrutura(movimentos, conc), [movimentos, conc])
  const totalPorGrupo = useMemo(() => new Map(grupos.map((g) => [g.id, g.totalCentavos])), [grupos])
  // Cálculo com overrides hierárquicos (classe > subgrupo > grupo) via chaves efetivas.
  const calcEf = (movs: readonly Movimento[], demo: Demonstracao, tipo: 'dre' | 'dfc') => {
    const ef = totaisEfetivos(movs, conc, cats, demo, tipo)
    return calcular({ linhas: demo.linhas, mapa: ef.mapaEfetivo }, ef.totalPorChave)
  }
  const dre = useMemo(() => calcEf(movimentos, dem.demo.dre, 'dre'), [movimentos, conc, cats, dem.demo.dre])
  // DFC = fluxo de caixa: valores a vencer (em aberto) não entram no resultado.
  const dfc = useMemo(() => calcEf(movimentosCaixa(movimentos), dem.demo.dfc, 'dfc'), [movimentos, conc, cats, dem.demo.dfc])
  const cob = useMemo(() => cobertura(movimentos, conc), [movimentos, conc])
  const serie = useMemo(() => serieMensal(movimentos, conc, regime), [movimentos, conc, regime])
  // Contínua: mesma filial, todos os meses — não obedece ao intervalo (tendência precisa do histórico).
  const movsFilialTodos = useMemo(() => filtrarPorFilial(todos, filial, modelo.centros, auto).dentro, [todos, filial, modelo.centros, auto])
  const serieContinua = useMemo(() => serieMensal(movsFilialTodos, conc, regime), [movsFilialTodos, conc, regime])

  // Período anterior equivalente para AH% — mesmo regime e mesmo filtro de filial.
  const anterior = useMemo(() => {
    const intAnt = intervaloAnterior(intervalo)
    if (!intAnt) return null
    const base = filtrarPorPeriodo(todos, intAnt, regime).dentro
    const movsAnt = filtrarPorFilial(base, filial, modelo.centros, auto).dentro
    return { dre: calcEf(movsAnt, dem.demo.dre, 'dre'), dfc: calcEf(movimentosCaixa(movsAnt), dem.demo.dfc, 'dfc') }
  }, [todos, intervalo, regime, filial, modelo.centros, auto, conc, cats, dem.demo.dre, dem.demo.dfc])
  const periodo = useMemo<InfoPeriodo>(
    () => ({
      intervalo,
      regime,
      dentro: movimentos.length,
      fora: filtro.fora,
      total: filtro.total,
      coberturaData: coberturaDatas(todos, regime),
      filial,
      foraFilial: filtroFilial.fora,
    }),
    [todos, intervalo, regime, filtro, filial, filtroFilial, movimentos],
  )

  return { movimentos, conc, grupos, totalPorGrupo, dre, dfc, anterior, cob, serie, serieContinua, periodo }
}

export { valorLinha } from '@/core/demonstracao'
