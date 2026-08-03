/**
 * @file Montagem do dataset do Comparativo de CAPEX: eixo mensal contínuo + séries
 * alinhadas (CAPEX realizado, linhas de DFC/DRE via useMesesDe — MESMO pipeline das
 * Demonstrações, nada de fórmula paralela —, orçado por adesaoCapex e projeção).
 * O catálogo de séries comparáveis vive aqui: só entra série com fonte REAL no app.
 *
 * Duas simetrias garantidas (review 03/08):
 * — FILIAL: o mesmo filtro de filial do CAPEX é aplicado às linhas de DFC/DRE — sem isso
 *   a razão misturava numerador de uma filial com denominador consolidado.
 * — REGIME: as séries da DFC são SEMPRE ancoradas pela baixa (regime caixa), igual ao
 *   CAPEX — bucketizá-las pela emissão (regime competência do filtro) deslocava o mesmo
 *   desembolso 2 meses no gráfico. A DRE segue o regime do filtro (competência é a
 *   natureza dela) e carrega o aviso de base mista na UI.
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
import type { FiltroFilial } from '@/core/filial'
import type { Conciliacao } from '@/core/modelo'
import type { Intervalo, Regime } from '@/core/periodo'
import type { MetodoProj } from '@/core/serie'
import { adesaoCapex } from './capexOrcado'
import { useMesesDe, type MesComparativo } from './useComparativo'
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
  /** Eixo real + meses projetados além dele (quando há projeção). */
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
  readonly filial: FiltroFilial
  readonly balde: BaldeCapex
  readonly selecionadas: readonly IdComparavel[]
  readonly horizonte: number
  readonly metodo: MetodoProj
  readonly orcMeses: Readonly<Record<string, readonly LinhaOrcamento[]>>
}

export function useComparativoCapexDados(e: Entrada): DadosComparativo {
  // DFC sempre em caixa (mesma âncora do CAPEX); DRE no regime do filtro (natureza dela).
  const mesesCaixa = useMesesDe(e.intervalo, 'caixa', e.filial)
  const mesesRegime = useMesesDe(e.intervalo, e.regime, e.filial)
  return useMemo(() => {
    const aMeses = (ms: readonly MesComparativo[], lado: 'dre' | 'dfc') =>
      ms.flatMap((m) => (m.intervalo.inicio ? [{ mes: m.intervalo.inicio.slice(0, 7), linhas: lado === 'dre' ? m.dre : m.dfc }] : []))
    const demoDfc = aMeses(mesesCaixa, 'dfc')
    const demoDre = aMeses(mesesRegime, 'dre')
    const eixo = eixoContinuo([...e.resumo.porMes.map((p) => p.mes), ...demoDfc.map((d) => d.mes), ...demoDre.map((d) => d.mes)])

    const sCapex = alinhar(eixo, serieCapex(e.resumo.porMes, e.balde), 0) as number[]
    const capexPeriodo = sCapex.reduce((s, v) => s + v, 0)

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
      const fonte = id.startsWith('dre') ? demoDre : demoDfc
      return alinhar(eixo, serieLinha(fonte, id), 0)
    }

    const proj = projetarCapex(eixo, sCapex, e.metodo, e.horizonte)
    const ultimoReal = eixo[eixo.length - 1] ?? ''
    const mesesExtras = proj.meses.filter((m) => m > ultimoReal)
    const eixoTotal = [...eixo, ...mesesExtras]
    const caudaNula = mesesExtras.map(() => null)

    const series: SerieDesenho[] = [
      { id: 'capex', rotulo: 'CAPEX realizado', cor: COR_CAPEX, valores: [...sCapex, ...caudaNula] },
      ...e.selecionadas
        .map((id) => CATALOGO.find((c) => c.id === id))
        .filter((c): c is (typeof CATALOGO)[number] => c !== undefined)
        .map((c) => ({ id: c.id, rotulo: c.rotulo, cor: c.cor, valores: [...valoresDe(c.id), ...caudaNula] })),
    ]
    if (proj.meses.length > 0) {
      // Conecta na âncora (último mês COM atividade) — meses projetados podem cair DENTRO
      // do eixo real (período que segue depois da última baixa de CAPEX).
      const projPorMes = new Map(proj.meses.map((m, i) => [m, proj.valores[i] ?? null]))
      const valores = eixoTotal.map((mes) => (mes === proj.ancora ? (sCapex[eixo.indexOf(mes)] ?? null) : (projPorMes.get(mes) ?? null)))
      series.push({ id: 'capex-proj', rotulo: 'CAPEX · projeção', cor: COR_CAPEX, tracejada: true, valores })
    }

    // Razões sobre o PERÍODO REAL (projeção fica fora). Sinal honesto: o fluxo de
    // investimento da DFC é saída líquida (negativo) quando há CAPEX — denominador é o módulo;
    // fluxo positivo (resgates > aplicações) deixa a razão sem sentido → null.
    const somaInv = somar(valoresDe('dfc_inv'))
    const somaDep = somar(valoresDe('dre_depreciacao'))
    const razaoInv = somaInv < 0 ? Math.round((capexPeriodo / Math.abs(somaInv)) * 100) : null
    const razaoDep = somaDep !== 0 ? Math.round((capexPeriodo / Math.abs(somaDep)) * 100) : null

    return { eixo, eixoTotal, series, capexPeriodo, razaoInv, razaoDep }
  }, [mesesCaixa, mesesRegime, e.resumo, e.conc, e.balde, e.selecionadas, e.horizonte, e.metodo, e.orcMeses])
}

const somar = (vs: readonly (number | null)[]): number => vs.reduce((s: number, v) => s + (v ?? 0), 0)
