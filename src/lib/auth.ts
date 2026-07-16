/** @file Sessão Supabase Auth: estado, login/logout, flag de auth desligável por env. */
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { MODO_APRESENTACAO } from './apresentacaoSnapshot'

/**
 * Auth é fail-closed: só o opt-out EXPLÍCITO (`VITE_AUTH_ENABLED=false`, para dev/local)
 * desliga o login. Var ausente/vazia ⇒ ligado — perder a env no deploy não pode abrir a porta
 * em silêncio (revisão 2026-07-16). A Apresentação offline sempre desliga (não tem backend).
 */
export const AUTH_ATIVO = import.meta.env.VITE_AUTH_ENABLED !== 'false' && !MODO_APRESENTACAO

// União discriminada: elimina estados impossíveis (CLAUDE.md §TIPAGEM).
export type Auth =
  | { readonly status: 'carregando' }
  | { readonly status: 'deslogado' }
  | { readonly status: 'logado'; readonly session: Session; readonly email: string }

function avaliar(session: Session | null): Auth {
  if (!session) return { status: 'deslogado' }
  return { status: 'logado', session, email: session.user.email ?? '' }
}

export function useAuth(): Auth {
  const [auth, setAuth] = useState<Auth>({ status: AUTH_ATIVO ? 'carregando' : 'deslogado' })

  useEffect(() => {
    if (!supabase || !AUTH_ATIVO) {
      setAuth({ status: 'deslogado' })
      return
    }
    supabase.auth.getSession().then(({ data }) => setAuth(avaliar(data.session)))
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setAuth(avaliar(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  return auth
}

export async function entrar(email: string, senha: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
  if (error) throw new Error(traduzir(error.message))
}

/** Cria a conta no próprio app (sem painel Supabase). Retorna se já entrou (autoconfirm). */
export async function cadastrar(email: string, senha: string): Promise<{ readonly logado: boolean }> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha })
  if (error) throw new Error(traduzir(error.message))
  return { logado: Boolean(data.session) }
}

export function sair(): Promise<unknown> {
  if (!supabase) return Promise.resolve()
  return supabase.auth.signOut()
}

function traduzir(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(msg)) return 'E-mail ainda não confirmado.'
  if (/already registered|already been registered|User already/i.test(msg)) return 'Esta conta já existe — use Entrar.'
  if (/at least 6|Password should/i.test(msg)) return 'A senha precisa ter ao menos 6 caracteres.'
  return msg
}
