/**
 * @file Lançamento manual: receita/despesa que NÃO passa pela conta bancária e portanto
 * o ERP nunca vê (vendas SAIPOS/iFood/Cardápio Web dos clientes de alimentação).
 *
 * Vive em tabela própria (painel_lancamentos_manuais) e entra no funil como TERCEIRA
 * fonte ao lado dos adapters Omie/Nibo — convertido aqui para o
 * `Movimento` canônico, o resto do app (DRE, DFC, conciliação, drill-down, HUD) o trata
 * como qualquer movimento. Nunca no doc raw do sync: o re-sync sobrescreve o doc.
 */
import type { Movimento } from './movimento'

/** Natureza declarada no formulário — subconjunto de `Natureza` (sem transferência/outra:
 *  lançamento manual é dinheiro que entrou ou saiu, nunca remanejo interno). */
export type NaturezaManual = 'receita' | 'despesa'

export interface LancamentoManual {
  readonly id: string
  readonly clienteId: string
  /** ISO 'aaaa-mm-dd' (formato do banco). A conversão emite dd/mm/aaaa, dialeto do funil. */
  readonly data: string
  readonly descricao: string
  /** Magnitude em centavos (> 0). O sinal vem da natureza, nunca do valor. */
  readonly valorCentavos: number
  readonly natureza: NaturezaManual
  /** Código da categoria do plano do cliente — obrigatório na criação: quem digita sabe
   *  o que é, então nada cai em "A Conciliar" (doutrina concilia-uma-vez). */
  readonly categoria: string
  /** Plataforma de onde veio o dinheiro (IFOOD, SAIPOS…) — vira a contraparte do movimento. */
  readonly origem: string
  readonly observacao: string
}

/** Sugestões do formulário — texto livre continua valendo (plataforma nova não espera deploy). */
export const ORIGENS_SUGERIDAS: readonly string[] = ['IFOOD', 'SAIPOS', 'CARDÁPIO WEB']

/** Marca visível nos drill-downs (coluna Origem) e âncora do id (`manual:<uuid>`). */
export const ORIGEM_MANUAL = 'MANUAL'

export function ehManual(m: Pick<Movimento, 'idTitulo'>): boolean {
  return m.idTitulo.startsWith('manual:')
}

/** ISO 'aaaa-mm-dd' → 'dd/mm/aaaa' (dialeto de data dos movimentos do sync). */
function dataBr(iso: string): string {
  const [a, m, d] = iso.split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

/**
 * Converte para o `Movimento` canônico. Decisões:
 * - natureza 'R'/'P' — o critério de entrada/saída de lib/resultado e do resumo do drill-down;
 * - liquidado 'S' + valorPago = valor + dataPagamento = data: lançamento manual é dinheiro
 *   JÁ realizado, então entra na DFC (movimentosCaixa) e nos dois regimes com a mesma data;
 * - contraparte = plataforma (origem): o agrupamento por contraparte no drill-down passa a
 *   responder "quanto veio do iFood?" de graça;
 * - origem 'MANUAL': aparece na coluna Origem das tabelas — o leitor sempre sabe que o
 *   número foi digitado, não sincronizado (mesma doutrina da etiqueta FONTE do provedor).
 */
export function movimentoDeLancamento(l: LancamentoManual): Movimento {
  const data = dataBr(l.data)
  return {
    idTitulo: `manual:${l.id}`,
    categoria: l.categoria,
    valorCentavos: l.valorCentavos,
    campoValor: 'manual.valorCentavos',
    data,
    dataEmissao: data,
    dataRegistro: data,
    dataPrevisao: data,
    dataVencimento: data,
    dataPagamento: data,
    status: 'LIQUIDADO',
    liquidado: 'S',
    documento: l.descricao,
    parcela: '',
    contraparte: l.origem.trim() || ORIGEM_MANUAL,
    contraparteCodigo: '',
    natureza: l.natureza === 'receita' ? 'R' : 'P',
    grupo: '',
    origem: ORIGEM_MANUAL,
    tipoDocumento: '',
    operacao: '',
    contaCorrente: '',
    jurosCentavos: 0,
    multaCentavos: 0,
    descontoCentavos: 0,
    valorPagoCentavos: l.valorCentavos,
    valorAbertoCentavos: 0,
  }
}
