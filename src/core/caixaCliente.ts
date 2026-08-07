/**
 * @file A segunda pergunta do dono: "posso pagar as contas?" — decisão de 07/08 ("as duas,
 * empilhadas"): resultado como manchete, caixa como linha secundária.
 *
 * Regras de honestidade que mandam no desenho:
 * 1. "Cobre até X" só existe com o saldo do mês corrente INFORMADO (a Omie não sincroniza
 *    saldo bancário — é entrada manual da AG, a mesma da Projeção). Sem ele, a linha diz o
 *    que sabe (contas a pagar) sem inventar cobertura.
 * 2. Conta VENCIDA e não paga continua devida — entra no corte como devida hoje, não some.
 * 3. Este número é operacional e muda todo dia; a UI carimba de quando é a sincronização.
 */
import type { Movimento } from './movimento'
import { dataDoMovimento, isoDeMov } from './periodo'
import { mesPorExtenso } from './manchete'

export interface LinhaCaixa {
  /** Saldo estimado de hoje (saldo inicial do mês + caixa do mês até hoje). null = saldo não informado. */
  readonly disponivelCentavos: number | null
  /** Títulos a PAGAR em aberto com vencimento até hoje+30 (inclui vencidos — continuam devidos). */
  readonly aPagarCentavos: number
  /** Títulos a RECEBER em aberto no mesmo corte (contexto, não entra na cobertura). */
  readonly aReceberCentavos: number
  readonly folgaCentavos: number | null
  readonly tom: 'positivo' | 'atencao' | 'negativo' | 'neutro'
  /** Frase pronta em linguagem de dono. */
  readonly frase: string
}

/** ISO + n dias → ISO (aritmética local, determinística — nada de Date.now aqui). */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(a!, m! - 1, d! + dias)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** '2026-08-28' → '28 de agosto'. */
const diaPorExtenso = (iso: string): string => `${Number(iso.slice(8, 10))} de ${mesPorExtenso(iso.slice(0, 7)).split(' de ')[0]}`

const sinal = (m: Movimento): number => (m.natureza.toUpperCase() === 'R' ? 1 : -1)

interface Aberto {
  readonly vencIso: string
  readonly valor: number
}

function abertosAte(movs: readonly Movimento[], natureza: 'P' | 'R', limiteIso: string): Aberto[] {
  const out: Aberto[] = []
  for (const m of movs) {
    if (m.natureza.toUpperCase() !== natureza || m.valorAbertoCentavos <= 0) continue
    const vencIso = isoDeMov(m.dataVencimento)
    if (!vencIso || vencIso > limiteIso) continue
    out.push({ vencIso, valor: m.valorAbertoCentavos })
  }
  return out.sort((a, b) => a.vencIso.localeCompare(b.vencIso))
}

/** Caixa do mês corrente até hoje (baixas), com sinal pela natureza. */
function caixaDoMes(movs: readonly Movimento[], mesIni: string, hojeIso: string): number {
  let total = 0
  for (const m of movs) {
    if ((m.valorPagoCentavos ?? 0) <= 0) continue
    const iso = dataDoMovimento(m, 'caixa')
    if (iso && iso >= mesIni && iso <= hojeIso) total += sinal(m) * m.valorPagoCentavos
  }
  return total
}

/**
 * Linha de caixa do painel do cliente. `saldoMesCorrente` = saldo inicial informado para o
 * mês de `hojeIso` (null = NÃO informado — jamais confundir com zero: zero é um saldo real).
 * Devolve null quando não há nada útil a dizer (sem saldo e sem títulos no corte).
 */
export function calcularLinhaCaixa(
  movs: readonly Movimento[],
  saldoMesCorrente: number | null,
  hojeIso: string,
): LinhaCaixa | null {
  const limite = somarDias(hojeIso, 30)
  const aPagar = abertosAte(movs, 'P', limite)
  const aReceber = abertosAte(movs, 'R', limite)
  const aPagarCentavos = aPagar.reduce((s, t) => s + t.valor, 0)
  const aReceberCentavos = aReceber.reduce((s, t) => s + t.valor, 0)

  const disponivelCentavos =
    saldoMesCorrente === null ? null : saldoMesCorrente + caixaDoMes(movs, `${hojeIso.slice(0, 7)}-01`, hojeIso)

  if (disponivelCentavos === null && aPagarCentavos === 0 && aReceberCentavos === 0) return null

  // Sem saldo informado: diz o que sabe, sem claim de cobertura (regra 1).
  if (disponivelCentavos === null) {
    return {
      disponivelCentavos: null,
      aPagarCentavos,
      aReceberCentavos,
      folgaCentavos: null,
      tom: 'neutro',
      frase:
        aPagarCentavos > 0
          ? `Contas a pagar até ${diaPorExtenso(limite)} já registradas — a cobertura aparece quando o saldo do mês estiver informado.`
          : `Nenhuma conta a pagar registrada até ${diaPorExtenso(limite)}.`,
    }
  }

  const folgaCentavos = disponivelCentavos - aPagarCentavos

  if (aPagarCentavos === 0) {
    return {
      disponivelCentavos,
      aPagarCentavos,
      aReceberCentavos,
      folgaCentavos,
      tom: disponivelCentavos >= 0 ? 'positivo' : 'negativo',
      frase:
        disponivelCentavos >= 0
          ? `Nenhuma conta a vencer nos próximos 30 dias.`
          : `O caixa está negativo — e não há contas registradas até ${diaPorExtenso(limite)}.`,
    }
  }

  // Caminha pelos vencimentos (vencida = devida hoje) até o caixa acabar.
  let cum = 0
  let cobreAte: string | null = null
  for (const t of aPagar) {
    cum += t.valor
    if (cum > disponivelCentavos) break
    cobreAte = t.vencIso < hojeIso ? hojeIso : t.vencIso
  }

  if (cum <= disponivelCentavos) {
    return {
      disponivelCentavos,
      aPagarCentavos,
      aReceberCentavos,
      folgaCentavos,
      tom: 'positivo',
      frase: `O caixa de hoje cobre as contas dos próximos 30 dias.`,
    }
  }
  if (cobreAte === null) {
    return {
      disponivelCentavos,
      aPagarCentavos,
      aReceberCentavos,
      folgaCentavos,
      tom: 'negativo',
      frase: `O caixa de hoje não cobre a próxima conta (${diaPorExtenso(aPagar[0]!.vencIso < hojeIso ? hojeIso : aPagar[0]!.vencIso)}).`,
    }
  }
  return {
    disponivelCentavos,
    aPagarCentavos,
    aReceberCentavos,
    folgaCentavos,
    tom: 'atencao',
    frase: `O caixa de hoje cobre as contas até ${diaPorExtenso(cobreAte)}.`,
  }
}
