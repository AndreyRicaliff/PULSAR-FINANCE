/** @file Sessão Supabase Auth: estado, login/logout, flag de auth desligável por env. */
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { MODO_APRESENTACAO } from './apresentacaoSnapshot'
import { URL_BOOT } from './urlBoot'

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
  /** Chegou pelo link de convite/recuperação: definir a nova senha ANTES de entrar no app. */
  | { readonly status: 'recuperar-senha'; readonly session: Session; readonly email: string }

function avaliar(session: Session | null): Auth {
  if (!session) return { status: 'deslogado' }
  return { status: 'logado', session, email: session.user.email ?? '' }
}

export function useAuth(): Auth {
  const [auth, setAuth] = useState<Auth>({ status: AUTH_ATIVO ? 'carregando' : 'deslogado' })
  // O hash do link (#…type=recovery) existe antes do supabase-js processá-lo — detectar no
  // boot cobre a corrida com o evento PASSWORD_RECOVERY (sem isso o convite caía no gate 2FA).
  // URL_BOOT: lida no boot, antes de o supabase-js apagar o hash (corrida que quebrava o
  // convite em aparelho rápido — report 03/08). O evento PASSWORD_RECOVERY continua como rede.
  const [recuperando, setRecuperando] = useState<boolean>(() => URL_BOOT.recuperacao)

  useEffect(() => {
    if (!supabase || !AUTH_ATIVO) {
      setAuth({ status: 'deslogado' })
      return
    }
    // Assinar ANTES do getSession: o evento PASSWORD_RECOVERY dispara no processamento do hash.
    const { data } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      setAuth(avaliar(session))
    })
    supabase.auth.getSession().then(({ data: d }) => setAuth((a) => (a.status === 'carregando' ? avaliar(d.session) : a)))
    return () => data.subscription.unsubscribe()
  }, [])

  if (recuperando && auth.status === 'logado') return { status: 'recuperar-senha', session: auth.session, email: auth.email }
  return auth
}

const DOMINIO_LOGIN = 'agconsultorialtda.com'

/** Login vira e-mail sintético do domínio AG — o trigger de signup exige @agconsultorialtda.com. */
export function emailDeLogin(login: string): string {
  const l = login.trim()
  return l.includes('@') ? l : `${l}@${DOMINIO_LOGIN}`
}

/** Entra por LOGIN (username) + senha — o e-mail real nunca é digitado. */
export async function entrar(login: string, senha: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { error } = await supabase.auth.signInWithPassword({ email: emailDeLogin(login), password: senha })
  if (error) throw new Error(traduzir(error.message))
}

/** Cria a conta no próprio app (sem painel Supabase). Retorna se já entrou (autoconfirm). */
export async function cadastrar(email: string, senha: string): Promise<{ readonly logado: boolean }> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha })
  if (error) throw new Error(traduzir(error.message))
  return { logado: Boolean(data.session) }
}

/** O próprio usuário logado define/troca a senha (updateUser). A senha só existe no gesto dele. */
export async function definirSenha(senha: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) throw new Error(traduzir(error.message))
}

/**
 * Chaves de DADO do painel que não podem sobreviver ao logout (auditoria 03/08: o reload
 * limpava só a memória — o localStorage seguia com movimentos/DRE do cliente anterior em
 * máquina compartilhada). Preserva preferências de UI (tema, som) e o token de aparelho
 * confiável, que é do dispositivo e tem esquecimento próprio.
 */
const PREFIXOS_DADO = ['cliente:', 'painel-ag-', 'lumen-cliente-ativo']

export function limparDadosLocais(): void {
  if (typeof window === 'undefined') return
  for (const k of Object.keys(localStorage)) {
    if (PREFIXOS_DADO.some((p) => k.startsWith(p))) localStorage.removeItem(k)
  }
}

export async function sair(): Promise<unknown> {
  if (!supabase) return Promise.resolve()
  const r = await supabase.auth.signOut()
  // Apaga o dado do cliente ANTES do reload: só recarregar limpava a memória, mas o
  // localStorage entregava o espelho do tenant anterior ao próximo usuário do aparelho.
  limparDadosLocais()
  if (typeof window !== 'undefined') window.location.reload()
  return r
}

function traduzir(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(msg)) return 'E-mail ainda não confirmado.'
  if (/already registered|already been registered|User already/i.test(msg)) return 'Esta conta já existe — use Entrar.'
  if (/at least 6|Password should/i.test(msg)) return 'A senha precisa ter ao menos 6 caracteres.'
  // Trigger de domínio (bloquear_signup_fora_ag) volta como P0001/'Database error' opaco → mostrava {}.
  if (/Database error saving new user|P0001|fora_ag|restrito ao dom|domínio AG/i.test(msg))
    return 'Acesso restrito a e-mails @agconsultorialtda.com.'
  if (!msg.trim() || msg === '{}') return 'Não foi possível entrar. Confira login e senha.'
  return msg
}
