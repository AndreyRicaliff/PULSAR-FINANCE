/**
 * @file Cadastro de clientes/fornecedores (da Omie). Mapeia código → nome, para
 * dar nome às contrapartes dos movimentos.
 */
export interface ClienteInfo {
  readonly nome: string
  readonly doc: string
}

export interface ClientesSeed {
  readonly geradoEm: string
  readonly clientes: Readonly<Record<string, ClienteInfo>>
}
