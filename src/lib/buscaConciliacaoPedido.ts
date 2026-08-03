/**
 * @file "Recolocar na Matriz" de outras telas: o pedido (dimensão + termo) viaja por
 * evento E fica pendente em módulo — os painéis montam sob demanda (`visitadas`), então
 * na 1ª navegação o ModeloPanel ainda não existe pra ouvir o evento (review 03/08).
 * Quem chega primeiro consome: listener (painel já montado) ou o mount (painel novo).
 */
import type { Dimensao } from '@/core/modelo'

export interface PedidoBusca {
  readonly dim: Extract<Dimensao, 'contas' | 'fornecedores'>
  readonly termo: string
}

let pendente: PedidoBusca | null = null

export function pedirBuscaConciliacao(pedido: PedidoBusca): void {
  pendente = pedido
  window.dispatchEvent(new CustomEvent<PedidoBusca>('lf-buscar-conciliacao', { detail: pedido }))
}

export function consumirBuscaPendente(): PedidoBusca | null {
  const p = pendente
  pendente = null
  return p
}
