/**
 * @file A apresentação exportada TEM dado, ou vai sair zerada?
 *
 * Report 2026-08-06 ("salvando apresentações em html em branco"): o HTML gerava certo, mas
 * saía com R$ 0,00 em tudo — e ia para o cliente assim, sem nenhum aviso. Reproduzido em
 * prod por DUAS causas independentes:
 *   1. cliente sem Matriz conciliada (9 dos 23 tenants em 06/08) — o mapa está vazio, então
 *      nenhum movimento chega à DRE/DFC;
 *   2. período da apresentação sem movimento (ex.: ago/26 escolhido no dia 6, antes do sync).
 *
 * Puro de propósito: a decisão de bloquear o export é regra de negócio, não detalhe de UI.
 */
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import { filtrarPorPeriodo, type Intervalo, type Regime } from './periodo'

export type CausaVazio = 'sem-movimento' | 'periodo-sem-movimento' | 'sem-conciliacao' | 'nada-classificado'

export interface DiagnosticoApresentacao {
  /** false ⇒ a apresentação sai com todos os números zerados. */
  readonly temDado: boolean
  readonly causa: CausaVazio | null
  /** Frase pronta para a UI — diz o que houve E o que fazer. */
  readonly mensagem: string
  readonly movimentosNoPeriodo: number
  /** Movimentos do período que caem em algum nó da estrutura (os que viram número). */
  readonly classificados: number
}

const OK: Omit<DiagnosticoApresentacao, 'movimentosNoPeriodo' | 'classificados'> = {
  temDado: true,
  causa: null,
  mensagem: '',
}

/**
 * Ordem importa: a causa reportada é a PRIMEIRA que o operador consegue resolver. Um cliente
 * sem conciliação E com período errado deve ouvir "concilie", não "troque o período".
 */
export function diagnosticarApresentacao(
  movimentos: readonly Movimento[],
  conc: Conciliacao,
  intervalo: Intervalo,
  regime: Regime = 'competencia',
): DiagnosticoApresentacao {
  if (movimentos.length === 0) {
    return {
      ...OK,
      temDado: false,
      causa: 'sem-movimento',
      mensagem: 'Este cliente ainda não tem movimentos sincronizados — a apresentação sairia com tudo zerado. Rode o sync antes de gerar.',
      movimentosNoPeriodo: 0,
      classificados: 0,
    }
  }

  if (Object.keys(conc.mapa).length === 0) {
    return {
      ...OK,
      temDado: false,
      causa: 'sem-conciliacao',
      mensagem: 'Nada foi conciliado na Matriz de Classificações — sem isso a DRE e a DFC saem R$ 0,00. Concilie as categorias antes de gerar.',
      movimentosNoPeriodo: movimentos.length,
      classificados: 0,
    }
  }

  const { dentro } = filtrarPorPeriodo(movimentos, intervalo, regime)
  if (dentro.length === 0) {
    return {
      ...OK,
      temDado: false,
      causa: 'periodo-sem-movimento',
      mensagem: 'Nenhum movimento cai no período escolhido — a apresentação sairia zerada. Ajuste o período (ou sincronize o mês).',
      movimentosNoPeriodo: 0,
      classificados: 0,
    }
  }

  const classificados = dentro.filter((m) => conc.mapa[m.categoria]).length
  if (classificados === 0) {
    return {
      ...OK,
      temDado: false,
      causa: 'nada-classificado',
      mensagem: `Os ${dentro.length} movimentos do período estão todos em categorias não conciliadas — nenhum entra na DRE/DFC. Concilie na Matriz antes de gerar.`,
      movimentosNoPeriodo: dentro.length,
      classificados: 0,
    }
  }

  return { ...OK, movimentosNoPeriodo: dentro.length, classificados }
}
