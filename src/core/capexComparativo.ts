/**
 * @file Núcleo puro do Comparativo de CAPEX: alinha séries mensais heterogêneas —
 * CAPEX realizado (caixa), linhas de DRE/DFC, orçado e projeção — num eixo mensal único.
 * Cada série declara a própria BASE; misturar caixa com competência é decisão de quem lê,
 * e a UI avisa quando acontece (o cálculo aqui nunca esconde a mistura).
 * `null` = mês SEM fonte (ex.: orçado não sincronizado) — diferente de 0 (fonte diz zero).
 */
import type { CapexMes } from './capex'
import type { LinhaCalc } from './demonstracao'
import { mesesContinuos, projetarValores, proximoMes, type MetodoProj } from './serie'

export type BaseSerie = 'caixa' | 'competencia' | 'orcado'

export type BaldeCapex = 'total' | 'investimento' | 'manutencao'

/** Série pronta pra desenhar/tabelar: cor fixa por ENTIDADE (nunca por ordem de render). */
export interface SerieDesenho {
  readonly id: string
  readonly rotulo: string
  readonly cor: string
  /** Estimativa/previsto — desenha tracejada. */
  readonly tracejada?: boolean
  /** Alinhado ao eixo de meses (centavos). null = mês sem fonte. */
  readonly valores: readonly (number | null)[]
}

/** Eixo contínuo cobrindo todas as chaves 'aaaa-mm' presentes (meses sem dado entram). */
export function eixoContinuo(chaves: readonly string[]): string[] {
  const ordenadas = [...chaves].filter(Boolean).sort()
  const primeiro = ordenadas[0]
  const ultimo = ordenadas[ordenadas.length - 1]
  if (!primeiro || !ultimo) return []
  return mesesContinuos(primeiro, ultimo)
}

/** Série mensal do CAPEX realizado por balde (mês sem baixa = 0 — a fonte existe e diz zero). */
export function serieCapex(porMes: readonly CapexMes[], balde: BaldeCapex): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of porMes) {
    const v =
      balde === 'investimento' ? p.investimentoCentavos
      : balde === 'manutencao' ? p.manutencaoCentavos
      : p.investimentoCentavos + p.manutencaoCentavos
    m.set(p.mes, v)
  }
  return m
}

/** Valor de uma linha de demonstração por mês (id de LINHAS_PADRAO, ex. dfc_inv). */
export function serieLinha(
  meses: readonly { readonly mes: string; readonly linhas: readonly LinhaCalc[] }[],
  linhaId: string,
): Map<string, number> {
  const m = new Map<string, number>()
  for (const { mes, linhas } of meses) {
    const linha = linhas.find((l) => l.id === linhaId)
    if (linha) m.set(mes, linha.valorCentavos)
  }
  return m
}

/** Alinha um mapa mês→valor ao eixo. Mês fora do mapa vira `semFonte` (0 ou null). */
export function alinhar(eixo: readonly string[], porMes: ReadonlyMap<string, number>, semFonte: number | null = 0): (number | null)[] {
  return eixo.map((mes) => porMes.get(mes) ?? semFonte)
}

export interface ProjecaoCapex {
  /** Meses projetados, consecutivos a partir da âncora (podem cair DENTRO do eixo real). */
  readonly meses: readonly string[]
  /** Valores projetados, um por mês (sempre estimativa — nunca dado real). */
  readonly valores: readonly number[]
  /** Último mês COM atividade — onde a linha tracejada conecta na real. null = sem base. */
  readonly ancora: string | null
}

const SEM_PROJECAO: ProjecaoCapex = { meses: [], valores: [], ancora: null }

/**
 * Projeção do CAPEX sobre a janela de ATIVIDADE (primeiro..último mês com valor ≠ 0):
 * zeros de preenchimento do período NÃO entram no ajuste — senão a cauda vazia de um
 * período largo projeta zero pra um CAPEX recorrente, e a mesma história de CAPEX geraria
 * projeções diferentes conforme o recorte de visualização.
 */
export function projetarCapex(eixo: readonly string[], valores: readonly number[], metodo: MetodoProj, horizonte: number): ProjecaoCapex {
  if (horizonte <= 0) return SEM_PROJECAO
  const ini = valores.findIndex((v) => v !== 0)
  if (ini === -1) return SEM_PROJECAO
  let fim = valores.length - 1
  while (fim > ini && valores[fim] === 0) fim--
  const base = valores.slice(ini, fim + 1)
  const ancora = eixo[fim]
  if (!ancora || base.length < 2) return SEM_PROJECAO
  const meses: string[] = []
  let mes = ancora
  for (let k = 0; k < horizonte; k++) {
    mes = proximoMes(mes)
    meses.push(mes)
  }
  return { meses, valores: projetarValores(base, metodo, horizonte), ancora }
}
