/**
 * @file Os números que ficam PRESOS na apresentação publicada.
 *
 * A migration de 24/07 dizia: "congelar o resultado é o que garante que reclassificar uma
 * categoria não muda a apresentação já entregue ao cliente". O `check` do banco exige
 * `numeros is not null` — mas `{}` não é null, e era exatamente `{}` que o publish gravava
 * (verificado em prod 06/08: 2 bytes nas 6 apresentações). A promessa existia no schema, na
 * mensagem de confirmação e em lugar nenhum no dado.
 *
 * Aqui mora a FORMA do congelado e a leitura defensiva dele. O cálculo em si continua nas
 * funções puras de sempre (totaisEfetivos → calcular) — congelar é fotografar, não recalcular
 * por outro caminho: duas fórmulas para o mesmo número é como o painel passa a divergir de si.
 */
import type { LinhaCalc } from './demonstracao'
import type { Intervalo, Regime } from './periodo'

/** Versão da forma do congelado — publicada antiga continua legível quando o formato mudar. */
export const VERSAO_CONGELAMENTO = 1

export interface NumerosCongelados {
  readonly versao: number
  /** ISO do instante da publicação (servidor carimba `publicado_em`; este é o do cálculo). */
  readonly geradoEm: string
  readonly intervalo: Intervalo
  readonly regime: Regime
  readonly dre: readonly LinhaCalc[]
  readonly dfc: readonly LinhaCalc[]
  /** Quantos movimentos entraram na conta — deixa auditável o que a foto pegou. */
  readonly movimentos: number
}

/**
 * `numeros` cru do banco → congelado utilizável, ou null. Retorna null para o `{}` legado:
 * a UI precisa distinguir "publicada sem foto" de "publicada com foto vazia" — a primeira
 * avisa que o número é o de hoje, a segunda mostraria zero como se fosse fato.
 */
export function lerCongelado(bruto: unknown): NumerosCongelados | null {
  if (!bruto || typeof bruto !== 'object') return null
  const n = bruto as Partial<NumerosCongelados>
  if (typeof n.versao !== 'number' || !Array.isArray(n.dre) || !Array.isArray(n.dfc)) return null
  return {
    versao: n.versao,
    geradoEm: typeof n.geradoEm === 'string' ? n.geradoEm : '',
    intervalo: n.intervalo ?? { inicio: null, fim: null },
    regime: n.regime === 'caixa' ? 'caixa' : 'competencia',
    dre: n.dre as readonly LinhaCalc[],
    dfc: n.dfc as readonly LinhaCalc[],
    movimentos: typeof n.movimentos === 'number' ? n.movimentos : 0,
  }
}

/** Monta o congelado a partir das linhas JÁ calculadas pelo pipeline normal. */
export function congelar(params: {
  readonly dre: readonly LinhaCalc[]
  readonly dfc: readonly LinhaCalc[]
  readonly intervalo: Intervalo
  readonly regime: Regime
  readonly movimentos: number
  readonly agoraIso: string
}): NumerosCongelados {
  return {
    versao: VERSAO_CONGELAMENTO,
    geradoEm: params.agoraIso,
    intervalo: params.intervalo,
    regime: params.regime,
    dre: params.dre,
    dfc: params.dfc,
    movimentos: params.movimentos,
  }
}
