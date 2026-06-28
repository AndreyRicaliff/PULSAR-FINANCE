/** @file Item conciliável (categoria ou contraparte agregada) exibido na board. */
export interface ItemConc {
  readonly chave: string
  readonly titulo: string
  readonly valorCentavos: number
  readonly qtd?: number
}
