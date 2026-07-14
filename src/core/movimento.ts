/**
 * @file Movimento financeiro individual (vindo do financas/mf da Omie).
 * Guardamos o detalhe pra permitir drill-down: "por que a categoria X tem tanto valor?".
 * Valor em centavos (inteiro).
 */
import { codigoContraparte } from './cliente'

export interface Movimento {
  /** nCodTitulo: id interno do título na Omie — chave estável p/ override. */
  readonly idTitulo: string
  readonly categoria: string
  readonly valorCentavos: number
  /** Qual campo da Omie forneceu o valor (auditoria). Ex.: 'detalhes.nValorTitulo'. */
  readonly campoValor: string
  /** Data principal (compat): emissão, senão vencimento, senão registro. */
  readonly data: string
  // Datas cruas da Omie — base da ponte competência × caixa.
  readonly dataEmissao: string
  readonly dataRegistro: string
  readonly dataPrevisao: string
  readonly dataVencimento: string
  /** dDtPagamento: data real da baixa (caixa). Existe em lançamentos de extrato (EXTR/EXTP). */
  readonly dataPagamento?: string
  /** dDtConcilia: data da conciliação bancária. */
  readonly dataConciliacao?: string
  readonly status: string
  /** resumo.cLiquidado: 'S' pago, 'N' em aberto, '' indefinido. */
  readonly liquidado: string
  readonly documento: string
  readonly parcela: string
  readonly contraparte: string
  /** Código do cliente/fornecedor na Omie (junta com o cadastro para virar nome). */
  readonly contraparteCodigo: string
  readonly natureza: string
  readonly grupo: string
  /** cOrigem: COMP, MANP (manual), CTEP, RPTP, APIP… */
  readonly origem: string
  /** cTipo: NFE, CTE, BOL… */
  readonly tipoDocumento: string
  /** cOperacao: código de operação da Omie. */
  readonly operacao: string
  /** nCodCC: conta corrente (banco). */
  readonly contaCorrente: string
  /** Código do departamento (centro de custo) Omie — vazio até o cliente ratear lá. */
  readonly departamento?: string
  /** nCodMovCC: id do lançamento de conta corrente (extrato) — join com ListarLancCC. */
  readonly idMovCC?: string
  // Valores crus do resumo (centavos), sem somar nada.
  readonly jurosCentavos: number
  readonly multaCentavos: number
  readonly descontoCentavos: number
  readonly valorPagoCentavos: number
  readonly valorAbertoCentavos: number
}

export interface MovimentosSeed {
  readonly geradoEm: string
  readonly movimentos: readonly Movimento[]
}

/**
 * Chave de agrupamento/resolução da contraparte: código do cadastro quando existe;
 * senão o nome cru do movimento (Nibo grava o nome no lançamento e código nulo); senão 'SEM'.
 */
export function chaveContraparte(m: Pick<Movimento, 'contraparte' | 'contraparteCodigo'>): string {
  return codigoContraparte(m.contraparteCodigo) || m.contraparte || 'SEM'
}

/** Título a vencer (em aberto): não é caixa realizado — fica fora da DFC. */
export function aVencer(m: Movimento): boolean {
  return m.liquidado === 'N'
}

/**
 * Base de CAIXA para a DFC: usa o valor efetivamente PAGO (valorPagoCentavos), não o valor
 * cheio do título. Assim o a vencer (pago = 0) some e o pagamento PARCIAL conta só a parte paga.
 */
export function movimentosCaixa(movs: readonly Movimento[]): Movimento[] {
  return movs
    .filter((m) => (m.valorPagoCentavos ?? 0) > 0)
    .map((m) => ({ ...m, valorCentavos: m.valorPagoCentavos }))
}
