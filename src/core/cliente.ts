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

/** GUID nulo: Nibo devolve isso quando o lançamento não tem stakeholder vinculado. */
const CODIGO_NULO = '00000000-0000-0000-0000-000000000000'

/** Código utilizável da contraparte — '' quando ausente ou GUID nulo. */
export function codigoContraparte(codigo: string): string {
  return codigo === CODIGO_NULO ? '' : codigo
}

/**
 * Nome humano da chave de contraparte: cadastro → a própria chave quando já é um nome
 * (Nibo agrupa pelo nome cru do movimento) → 'Código N' para código Omie sem cadastro.
 */
export function nomeContraparte(chave: string, clientes: Readonly<Record<string, ClienteInfo>>): string {
  const cod = codigoContraparte(chave)
  if (!cod || cod === 'SEM') return 'Sem contraparte'
  const info = clientes[cod]
  if (info?.nome) return info.nome
  return /^\d+$/.test(cod) ? `Código ${cod}` : cod
}
