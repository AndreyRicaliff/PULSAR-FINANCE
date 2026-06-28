/**
 * @file Tenant = cliente DA AG Consultoria (ex.: Acme) sobre quem rodamos o BPO.
 * Não confundir com `cliente.ts` (ClienteInfo = contraparte da Omie, cliente DO tenant).
 * UI chama isto de "Clientes". Acme tem id fixo para migrar o estado já existente.
 */
export const ACME_ID = '00000000-0000-4000-8000-000000000036'

export interface Tenant {
  readonly id: string
  readonly nome: string
  readonly documento: string | null
  readonly ativo: boolean
  readonly criadoEm?: string
}

export const ACME: Tenant = { id: ACME_ID, nome: 'Acme', documento: null, ativo: true }

/** ACME 27 — segundo tenant em produção (painel_clientes). ACME_ID é o 36. */
export const ACME_27_ID = '00000000-0000-4000-8000-000000000027'

/**
 * Piso de dados por cliente (ISO 'aaaa-mm-dd'): movimentos anteriores a esta data
 * são descartados em runtime para o tenant. Definido a pedido (2026-06-14): as duas
 * empresas atuais (ACME 27 e 36) só consideram dados a partir de maio/2026.
 */
export const PISO_DADOS_POR_CLIENTE: Readonly<Record<string, string>> = {
  [ACME_ID]: '2026-05-01', // ACME 36
  [ACME_27_ID]: '2026-05-01', // ACME 27
}

export function pisoDadosDoCliente(clienteId: string): string | null {
  return PISO_DADOS_POR_CLIENTE[clienteId] ?? null
}

/** Prefixa a chave de estado pelo cliente ativo — isola a camada editada por tenant. */
export function chaveDoCliente(clienteId: string, base: string): string {
  return `cliente:${clienteId}:${base}`
}
