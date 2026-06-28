/**
 * @file Indicadores relevantes derivados da DRE/DFC CONFIGURADA (módulo de edição).
 * Cada indicador aponta a fórmula/composição configurada de onde sai. Spec §7.
 */
import type { Categoria } from '@/core/categoria'
import { totaisEfetivos } from '@/core/classes'
import { calcular, type Demonstracao, type LinhaCalc } from '@/core/demonstracao'
import type { Conciliacao } from '@/core/modelo'
import { movimentosCaixa, type Movimento } from '@/core/movimento'
import { dataDoMovimento, type Regime } from '@/core/periodo'
import { espelhoEstrutura, type GrupoEspelho } from './resultado'
import { brl, fracVariacao, pct } from './money'

export type Cor = 'primary' | 'secondary' | 'accent' | 'danger' | 'warn'

export interface Indicador {
  readonly nome: string
  readonly valor: string
  readonly formula: string
  readonly cor: Cor
  /** Variação % vs período anterior equivalente — undefined quando não há anterior definido. */
  readonly tendencia?: number
}

function valorDe(linhas: readonly LinhaCalc[], id: string): number {
  return linhas.find((l) => l.id === id)?.valorCentavos ?? 0
}

function corResultado(n: number): Cor {
  return n >= 0 ? 'accent' : 'danger'
}

/** % de mudança de `atual` em relação a `ant`. Zero como base → undefined (sem % inventado). */
function tendenciaDe(atual: number, ant: number): number | undefined {
  const f = fracVariacao(atual, ant)
  return f === null ? undefined : Math.round(f * 100)
}

interface ValoresChave {
  rl: number; mc: number; ebitda: number; liquido: number
  despFixas: number; caixa: number; mcPct: number; pe: number
}

function valoresChave(dre: readonly LinhaCalc[], dfc: readonly LinhaCalc[]): ValoresChave {
  const rl = valorDe(dre, 'dre_receita_liq')
  const mc = valorDe(dre, 'dre_mc')
  const ebitda = valorDe(dre, 'dre_ebitda')
  const liquido = valorDe(dre, 'dre_liquido')
  const despFixas = -valorDe(dre, 'dre_despesas')
  const caixa = valorDe(dfc, 'dfc_var')
  const mcPct = rl ? mc / rl : 0
  const pe = mcPct > 0 ? despFixas / mcPct : 0
  return { rl, mc, ebitda, liquido, despFixas, caixa, mcPct, pe }
}

export function calcularIndicadores(
  dre: readonly LinhaCalc[],
  dfc: readonly LinhaCalc[],
  grupos: readonly GrupoEspelho[] = [],
  ant?: { dre: readonly LinhaCalc[]; dfc: readonly LinhaCalc[] },
): Indicador[] {
  const v = valoresChave(dre, dfc)
  const a = ant ? valoresChave(ant.dre, ant.dfc) : null

  return [
    ind('Receita Líquida', brl(v.rl), 'Receita Bruta − Deduções', 'primary', a ? tendenciaDe(v.rl, a.rl) : undefined),
    ind('Margem de Contribuição', `${brl(v.mc)} · ${pct(v.mc, v.rl)}`, 'MC ÷ Receita Líquida', corResultado(v.mc), a ? tendenciaDe(v.mc, a.mc) : undefined),
    ind('Margem EBITDA', pct(v.ebitda, v.rl), 'EBITDA ÷ Receita Líquida', corResultado(v.ebitda), a ? tendenciaDe(v.ebitda, a.ebitda) : undefined),
    ind('Margem Líquida', pct(v.liquido, v.rl), 'Resultado Líquido ÷ Receita Líquida', corResultado(v.liquido), a ? tendenciaDe(v.liquido, a.liquido) : undefined),
    ind('Resultado Líquido', brl(v.liquido), 'Cascata completa da DRE configurada', corResultado(v.liquido), a ? tendenciaDe(v.liquido, a.liquido) : undefined),
    ind('Geração de Caixa', brl(v.caixa), 'Variação de Caixa (DFC · regime caixa)', corResultado(v.caixa), a ? tendenciaDe(v.caixa, a.caixa) : undefined),
    ind('Ponto de Equilíbrio', v.pe > 0 ? brl(v.pe) : '—', 'Despesas Fixas ÷ Margem de Contribuição %', 'warn', a && v.pe > 0 && a.pe > 0 ? tendenciaDe(v.pe, a.pe) : undefined),
    ind('Despesas Operacionais', brl(v.despFixas), 'Soma das linhas de despesa configuradas', 'secondary', a ? tendenciaDe(v.despFixas, a.despFixas) : undefined),
    ...indicadoresRelatorioAG(dre, grupos),
  ]
}

/** Razões do padrão de relatório AG (skill relatoriobpo): folha e custo do dinheiro. */
function indicadoresRelatorioAG(dre: readonly LinhaCalc[], grupos: readonly GrupoEspelho[]): Indicador[] {
  const rb = valorDe(dre, 'dre_receita')
  const ebit = valorDe(dre, 'dre_ebit')
  const financeiro = valorDe(dre, 'dre_financeiro')
  const folha = -(grupos.find((g) => g.id === 'despesas_pessoal')?.totalCentavos ?? 0)
  return [
    ind('Folha / Faturamento', folha > 0 ? pct(folha, rb) : '—', 'Despesas com Pessoal ÷ Receita Bruta', 'warn'),
    ind(
      'Custo Financeiro / EBIT',
      financeiro < 0 && ebit !== 0 ? pct(-financeiro, Math.abs(ebit)) : '—',
      '|Resultado Financeiro| ÷ |EBIT| — quanto do operacional o dinheiro consome',
      'secondary',
    ),
  ]
}

function ind(nome: string, valor: string, formula: string, cor: Cor, tendencia?: number): Indicador {
  return { nome, valor, formula, cor, tendencia }
}

// --- Séries mensais dos indicadores (mini-gráfico dos cards) ---

export interface PontoIndicador {
  /** Rótulo do mês 'mm/aa'. */
  readonly rotulo: string
  readonly valor: number
  /** true para indicadores em % (margens, folha) — formata diferente no tooltip. */
  readonly percentual: boolean
}

/** Formata valor de um ponto de indicador: % pt-BR com 1 casa ou BRL (centavos). */
export function fmtIndicador(valor: number, percentual: boolean): string {
  return percentual ? `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : brl(valor)
}

/**
 * Recalcula a DRE/DFC configurada mês a mês e devolve a série de cada indicador
 * (chave = nome do card). Razões (%) só ganham ponto quando a base do mês existe —
 * mês sem receita não vira margem inventada.
 */
export function seriesDosIndicadores(
  movs: readonly Movimento[],
  conc: Conciliacao,
  demoDre: Demonstracao,
  demoDfc: Demonstracao,
  regime: Regime,
  categorias: readonly Categoria[],
): ReadonlyMap<string, PontoIndicador[]> {
  const out = new Map<string, PontoIndicador[]>()
  for (const { rotulo, movs: movsMes } of mesesOrdenados(movs, regime)) {
    const ponto = (nome: string, valor: number | null, percentual: boolean) => {
      if (valor === null) return
      const lista = out.get(nome) ?? []
      lista.push({ rotulo, valor, percentual })
      out.set(nome, lista)
    }
    pontosDoMes(movsMes, conc, demoDre, demoDfc, categorias, ponto)
  }
  return out
}

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`

function mesesOrdenados(
  movs: readonly Movimento[],
  regime: Regime,
): { rotulo: string; movs: Movimento[] }[] {
  const porMes = new Map<string, Movimento[]>()
  for (const m of movs) {
    const iso = dataDoMovimento(m, regime)
    if (!iso) continue
    const mes = iso.slice(0, 7)
    const lista = porMes.get(mes) ?? []
    lista.push(m)
    porMes.set(mes, lista)
  }
  return [...porMes.keys()].sort().map((mes) => ({ rotulo: rotuloMes(mes), movs: porMes.get(mes) ?? [] }))
}

function pontosDoMes(
  movsMes: readonly Movimento[],
  conc: Conciliacao,
  demoDre: Demonstracao,
  demoDfc: Demonstracao,
  categorias: readonly Categoria[],
  ponto: (nome: string, v: number | null, percentual: boolean) => void,
): void {
  const grupos = espelhoEstrutura(movsMes, conc)
  // Mesmo motor do app: overrides (classe>subgrupo>grupo); DFC sobre caixa pago (a vencer fora).
  const efDre = totaisEfetivos(movsMes, conc, categorias, demoDre, 'dre')
  const dre = calcular({ linhas: demoDre.linhas, mapa: efDre.mapaEfetivo }, efDre.totalPorChave)
  const efDfc = totaisEfetivos(movimentosCaixa(movsMes), conc, categorias, demoDfc, 'dfc')
  const dfc = calcular({ linhas: demoDfc.linhas, mapa: efDfc.mapaEfetivo }, efDfc.totalPorChave)
  const rl = valorDe(dre, 'dre_receita_liq')
  const rb = valorDe(dre, 'dre_receita')
  const liquido = valorDe(dre, 'dre_liquido')
  const folha = -(grupos.find((g) => g.id === 'despesas_pessoal')?.totalCentavos ?? 0)
  ponto('Receita Líquida', rl, false)
  ponto('Margem de Contribuição', valorDe(dre, 'dre_mc'), false)
  ponto('Margem EBITDA', rl > 0 ? (valorDe(dre, 'dre_ebitda') / rl) * 100 : null, true)
  ponto('Margem Líquida', rl > 0 ? (liquido / rl) * 100 : null, true)
  ponto('Resultado Líquido', liquido, false)
  ponto('Geração de Caixa', valorDe(dfc, 'dfc_var'), false)
  ponto('Despesas Operacionais', -valorDe(dre, 'dre_despesas'), false)
  ponto('Folha / Faturamento', rb > 0 && folha > 0 ? (folha / rb) * 100 : null, true)
}
