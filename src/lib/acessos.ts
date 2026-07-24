/** @file Gestão de acessos (operador): cria/lista/reseta/remove logins via edge `manage-user`. */
import { supabase } from './supabase'

export interface Empresa {
  readonly id: string
  readonly nome: string
}

export interface AcessoConta {
  readonly user_id: string
  readonly login: string
  readonly email: string | null
  readonly papel: 'operador' | 'cliente'
  readonly empresas: readonly Empresa[]
  readonly last_sign_in_at: string | null
}

// A edge devolve erros de negócio como 200 { error } (supabase-js engole corpo non-2xx).
async function chamar<T = unknown>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.functions.invoke('manage-user', { body })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data && data.error) throw new Error(String(data.error))
  return data as T
}

export const listarAcessos = (): Promise<AcessoConta[]> =>
  chamar<{ accounts: AcessoConta[] }>({ action: 'list-accounts' }).then((r) => r.accounts ?? [])

export const criarAcesso = (login: string, password: string, clienteIds: string[], papel: 'cliente' | 'operador' = 'cliente') =>
  chamar({ action: 'create', login, password, cliente_ids: clienteIds, papel })

export const redefinirSenhaAcesso = (userId: string, password: string) =>
  chamar({ action: 'update-password', user_id: userId, password })

export const removerAcesso = (userId: string) => chamar({ action: 'delete', user_id: userId })
