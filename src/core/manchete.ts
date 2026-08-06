/**
 * @file A resposta que o dono quer em 10 segundos, derivada da série mensal.
 *
 * O HUD abria em indicadores: corretos, mas que exigem INTERPRETAÇÃO. Quem recebe o relatório
 * do BPO quer primeiro "como foi o mês", e só depois o detalhe. Isto produz a frase.
 *
 * Regra que manda no desenho: a manchete é do último mês FECHADO. O mês corrente está
 * incompleto por definição — anunciar "julho: R$ 3 mil" no dia 2 de julho é dado verdadeiro
 * que comunica mentira. Comparar um mês parcial com um mês inteiro é pior ainda.
 */

export interface MesResumo {
  readonly mes: string // 'aaaa-mm'
  readonly rotulo: string // 'mm/aa'
  readonly entrada: number
  readonly saida: number
  readonly saldo: number
  readonly projetado: boolean
}

export type Tom = 'positivo' | 'negativo' | 'neutro'

export interface Manchete {
  /** Mês de referência já por extenso ('julho de 2026'). */
  readonly periodo: string
  readonly entradaCentavos: number
  readonly saidaCentavos: number
  readonly saldoCentavos: number
  readonly tom: Tom
  /** Variação do saldo contra o mês fechado anterior. null = sem base comparável. */
  readonly variacao: { readonly frac: number; readonly rotuloMes: string } | null
  /** Frase pronta, em linguagem de dono — sem 'competência', 'regime' ou 'DRE'. */
  readonly frase: string
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const

/** 'aaaa-mm' → 'julho de 2026'. */
export function mesPorExtenso(mes: string): string {
  const [ano, m] = mes.split('-')
  const nome = MESES[Number(m) - 1]
  return nome && ano ? `${nome} de ${ano}` : mes
}

/**
 * Último mês FECHADO da série: descarta projeções e o mês corrente. `mesAtual` entra por
 * parâmetro (não `new Date()` aqui dentro) para o núcleo continuar puro e testável.
 */
export function ultimoMesFechado(serie: readonly MesResumo[], mesAtual: string): MesResumo | null {
  const fechados = serie.filter((p) => !p.projetado && p.mes < mesAtual)
  return fechados.length ? fechados[fechados.length - 1]! : null
}

function frase(m: MesResumo, variacao: number | null, rotuloAnterior: string | null): string {
  const periodo = mesPorExtenso(m.mes)
  if (m.saldo === 0) return `Em ${periodo}, o que entrou e o que saiu se equilibraram.`
  const verbo = m.saldo > 0 ? 'sobrou' : 'faltou'
  if (variacao === null || rotuloAnterior === null) {
    return `Em ${periodo}, ${verbo} dinheiro no caixa da operação.`
  }
  // Sem base (mês anterior zerado) o percentual é infinito — some com ele em vez de mentir.
  if (!Number.isFinite(variacao)) return `Em ${periodo}, ${verbo} dinheiro — o mês anterior fechou no zero.`
  const pp = Math.abs(Math.round(variacao * 100))
  if (pp === 0) return `Em ${periodo}, ${verbo} praticamente o mesmo de ${rotuloAnterior}.`
  const direcao = variacao > 0 ? 'a mais' : 'a menos'
  return `Em ${periodo}, ${verbo} ${pp}% ${direcao} que em ${rotuloAnterior}.`
}

/** Manchete do último mês fechado. null quando ainda não há mês fechado na série. */
export function calcularManchete(serie: readonly MesResumo[], mesAtual: string): Manchete | null {
  const atual = ultimoMesFechado(serie, mesAtual)
  if (!atual) return null
  const fechados = serie.filter((p) => !p.projetado && p.mes < mesAtual)
  const anterior = fechados.length > 1 ? fechados[fechados.length - 2]! : null
  const variacao = anterior && anterior.saldo !== 0 ? (atual.saldo - anterior.saldo) / Math.abs(anterior.saldo) : null

  return {
    periodo: mesPorExtenso(atual.mes),
    entradaCentavos: atual.entrada,
    saidaCentavos: atual.saida,
    saldoCentavos: atual.saldo,
    tom: atual.saldo > 0 ? 'positivo' : atual.saldo < 0 ? 'negativo' : 'neutro',
    variacao: variacao !== null ? { frac: variacao, rotuloMes: mesPorExtenso(anterior!.mes).split(' de ')[0]! } : null,
    frase: frase(atual, variacao, anterior ? mesPorExtenso(anterior.mes).split(' de ')[0]! : null),
  }
}
