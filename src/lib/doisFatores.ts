/**
 * @file Segundo fator por código de e-mail.
 *
 * Depois do login por senha existe uma sessão no navegador, mas ela não lê NADA: a RLS
 * exige `sessao_verificada()` (ver migration 2026_07_25_2fa_email.sql). Este módulo é a
 * ponte até lá — e o estado de "verificado" é lido do BANCO, nunca de localStorage:
 * um flag local seria trivial de forjar no console.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Estado2FA = 'checando' | 'pendente' | 'liberado'

async function chamar(body: Record<string, unknown>): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.functions.invoke('dois-fatores', { body })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data && data.error) throw new Error(String(data.error))
}

export async function enviarCodigo(): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.functions.invoke('dois-fatores', { body: { acao: 'enviar' } })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(String(data.error))
  return String(data?.enviadoPara ?? '')
}

export const verificarCodigo = (codigo: string) => chamar({ acao: 'verificar', codigo })

/**
 * `session_id` não é campo do objeto Session — é um claim DENTRO do access_token.
 * Ler o payload no cliente é seguro: quem assina é o servidor, e a decisão de verdade
 * (quem pode ler dado) fica na RLS, não aqui. Isto só escolhe qual tela mostrar.
 */
function sessionIdDoToken(accessToken: string): string {
  try {
    return String(JSON.parse(atob(accessToken.split('.')[1] ?? '')).session_id ?? '')
  } catch {
    return ''
  }
}

/** A sessão atual já passou pelo segundo fator? Quem responde é o banco. */
export function use2FA(): { readonly estado: Estado2FA; readonly revalidar: () => Promise<void> } {
  const [estado, setEstado] = useState<Estado2FA>('checando')

  const revalidar = useCallback(async () => {
    if (!supabase) return setEstado('liberado') // sem backend não há o que proteger (modo offline)
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) return setEstado('pendente')
    const idAtual = sessionIdDoToken(token)
    const { data } = await supabase.from('painel_sessoes_2fa').select('session_id')
    setEstado((data ?? []).some((r) => r.session_id === idAtual) ? 'liberado' : 'pendente')
  }, [])

  useEffect(() => {
    void revalidar()
  }, [revalidar])

  return { estado, revalidar }
}
