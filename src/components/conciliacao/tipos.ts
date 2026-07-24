/** @file Item conciliável (categoria ou contraparte agregada) exibido na board. */
import type { Natureza } from '@/core/categoria'

export interface ItemConc {
  readonly chave: string
  readonly titulo: string
  readonly valorCentavos: number
  readonly qtd?: number
  /** Natureza da categoria (contas) — alimenta a etiqueta Entrada/Saída. Ausente em contraparte. */
  readonly natureza?: Natureza
}
