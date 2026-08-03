/**
 * @file Montagem do dataset do Comparativo de CAPEX: eixo mensal contínuo + séries
 * alinhadas (CAPEX realizado, linhas de DFC/DRE via useMesesDe — MESMO pipeline das
 * Demonstrações, nada de fórmula paralela —, orçado por adesaoCapex e projeção).
 * O catálogo de séries comparáveis vive aqui: só entra série com fonte REAL no app.
 */
import { useMemo } from 'react'
import type { ResumoCapex } from '@/core/capex'
import {
  alinhar,
  eixoContinuo,
  projetarCapex,
  serieCapex,
  serieLinha,
  type BaldeCapex,
  type BaseSerie,
  type SerieDesenho,
} from '@/core/capexComparativo'
import type { Conciliacao } from '@/core/modelo'
import type { Intervalo, Regime } from '@/core/periodo'
import type { MetodoProj } from '@/core/serie'
import { adesaoCapex } from './capexOrcado'
import { useMesesDe } from './useComparativo'
import type { LinhaOrcamento } from './useOrcamento'

const COR_CAPEX = 'rgb(var(--c-accent))'

/** Séries comparáveis com fonte REAL no app — cor fixa por entidade (nunca por ordem). */
export const CATALOGO: readonly { id: IdComparavel; rotulo: string; base: BaseSerie; cor: string }[] = [
  { id: 'dfc_inv', rotulo: 'DFC · Fluxo de Investimento', base: 'caixa', cor: 'rgb(var(--c-secondary))' },
  { id: 'dfc_op', rotulo: 'DFC · Fluxo Operacional', base: 'caixa', cor: 'rgb(var(--c-muted))' },
  { id: 'dfc_var', rotulo: 'DFC · Variação de Caixa', base: 'caixa', cor: 'rgb(var(--c-danger))' },
  { id: 'dre_depreciacao', rotulo: 'DRE · Depreciação', base: 'competencia', cor: 'rgb(var(--c-text))' },
  { id: 'orcado', rotulo: 'CAPEX orçado', base: 'orcado', cor: 'rgb(var(--c-warn))' },
]

export type IdComparavel = 'dfc_inv' | 'dfc_op' | 'dfc_var' | 'dre_depreciacao' | 'orcado'

export interface DadosComparativo {
  /** Meses REAIS (contínuos) do comparativo. */
  readonly eixo: readonly string[]
  /** Eixo real + meses projetados (quando há projeção). */
  readonly eixoTotal: readonly string[]
  /** CAPEX primeiro, depois as selecionadas, projeção por último. */
  readonly series: readonly SerieDesenho[]
  readonly capexPeriodo: number
  /** CAPEX ÷ |Fluxo de Investimento| em % — null quando o fluxo não é saída líquida. */
  readonly razaoInv: number | null
  /** CAPEX ÷ |Depreciação| em % — null sem depreciação no período (base mista, ler tendência). */
  readonly razaoDep: number | null
}

interface Entrada {
  readonly resumo: ResumoCapex
  readonly conc: Conciliacao
  readonly intervalo: Intervalo
  readonly regime: Regime
  readonly balde: BaldeCapex
  readonly selecionadas: readonly IdComparavel[]
  readonly horizonte: number
  readonly metodo: MetodoProj
  readonly orcMeses: Readonly<Record<string, readonly LinhaOrcamento[]>>
}

export function useComparativoCapexDados(e: Entrada): DadosComparativo {
  const mesesDemo = useMesesDe(e.intervalo, e.regime)
  return useMemo(() => {
    // useMesesDe devolve janelas mensais fechadas; inicio null (janela aberta) não ocorre — filtrar cala o TS sem mascarar.
    const demo = mesesDemo.flatMap((m) => (m.intervalo.inicio ? [{ mes: m.intervalo.inicio.slice(0, 7), dre: m.dre, dfc: m.dfc }] : []))
    const eixo = eixoContinuo([...e.resumo.porMes.map((p) => p.mes), ...demo.map((d) => d.mes)])

    const sCapex = alinhar(eixo, serieCapex(e.resumo.porMes, e.balde), 0) as number[]
    const capexPeriodo = sCapex.reduce((s, v) => s + v, 0)

    const porLinha = (id: string, tipo: 'dre' | 'dfc') =>
      serieLinha(demo.map((d) => ({ mes: d.mes, linhas: tipo === 'dre' ? d.dre : d.dfc })), id)

    const valoresDe = (id: IdComparavel): (number | null)[] => {
      if (id === 'orcado') {
        // null = mês SEM orçamento sincronizado (fonte ausente ≠ orçado zero).
        return eixo.map((mes) => {
          if (!(mes in e.orcMeses)) return null
          const a = adesaoCapex(e.orcMeses, [mes], e.conc)
          if (e.balde === 'investimento') return a.investimento.previstoCentavos
          if (e.balde === 'manutencao') return a.manutencao.previstoCentavos
          return a.investimento.previstoCentavos + a.manutencao.previstoCentavos
        })
      }
      return alinhar(eixo, porLinha(id, id.startsWith('dre') ? 'dre' : 'dfc'), 0)
    }

    const proj = e.horizonte > 0 ? projetarCapex(eixo, sCapex, e.metodo, e.horizonte) : { meses: [], valores: [] }
    const eixoTotal = [...eixo, ...proj.meses]
    const caudaNula = proj.meses.map(() => null)

    const series: SerieDesenho[] = [
      { id: 'capex', rotulo: 'CAPEX realizado', cor: COR_CAPEX, valores: [...sCapex, ...caudaNula] },
      ...e.selecionadas
        .map((id) => CATALOGO.find((c) => c.id === id))
        .filter((c): c is (typeof CATALOGO)[number] => c !== undefined)
        .map((c) => ({ id: c.id, rotulo: c.rotulo, cor: c.cor, valores: [...valoresDe(c.id), ...caudaNula] })),
    ]
    if (proj.meses.length > 0) {
      // Conecta no último mês real pra linha não nascer solta no ar.
      const valores: (number | null)[] = eixo.map((_, i) => (i === eixo.length - 1 ? (sCapex[i] ?? null) : null))
      series.push({ id: 'capex-proj', rotulo: 'CAPEX · projeção', cor: COR_CAPEX, tracejada: true, valores: [...valores, ...proj.valores] })
    }

    // Razões sobre o PERÍODO REAL (projeção fica fora). Sinal honesto: o fluxo de
    // investimento da DFC é saída líquida (negativo) quando há CAPEX — denominador é o módulo;
    // fluxo positivo (resgates > aplicações) deixa a razão sem sentido → null.
    const somaInv = somar(valoresDe('dfc_inv'))
    const somaDep = somar(valoresDe('dre_depreciacao'))
    const razaoInv = somaInv < 0 ? Math.round((capexPeriodo / Math.abs(somaInv)) * 100) : null
    const razaoDep = somaDep !== 0 ? Math.round((capexPeriodo / Math.abs(somaDep)) * 100) : null

    return { eixo, eixoTotal, series, capexPeriodo, razaoInv, razaoDep }
  }, [mesesDemo, e.resumo, e.conc, e.balde, e.selecionadas, e.horizonte, e.metodo, e.orcMeses])
}

const somar = (vs: readonly (number | null)[]): number => vs.reduce((s: number, v) => s + (v ?? 0), 0)
