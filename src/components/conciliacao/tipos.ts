/** @file Item conciliável (categoria ou contraparte agregada) exibido na board. */
import type { Natureza } from '@/core/categoria'
import type { EstadoRegistro } from '@/core/estadoRegistro'

export interface ItemConc {
  readonly chave: string
  readonly titulo: string
  readonly valorCentavos: number
  readonly qtd?: number
  /** Natureza da categoria (contas) — alimenta a etiqueta Entrada/Saída. Ausente em contraparte. */
  readonly natureza?: Natureza
  /** Estado do cadastro no ERP (inativa/excluída) ou marcado no nome — vira pill na board. */
  readonly estado?: EstadoRegistro
}
