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

/**
 * Segredo do aparelho confiável. Fica no localStorage — o mesmo lugar onde o token da
 * sessão Supabase já vive, então não amplia a superfície: quem conseguir ler daqui já
 * teria a sessão inteira. O que ele NÃO é: prova de identidade por si só — o servidor
 * confere o hash e o dono antes de liberar.
 */
const CHAVE_APARELHO = 'pulsar-aparelho'

export const aparelhoLembrado = () => localStorage.getItem(CHAVE_APARELHO) ?? ''
export const esquecerAparelho = () => localStorage.removeItem(CHAVE_APARELHO)

/** Verifica o código. Com `lembrar`, o servidor emite o segredo do aparelho UMA vez. */
export async function verificarCodigo(codigo: string, lembrar = false): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.functions.invoke('dois-fatores', {
    body: { acao: 'verificar', codigo, lembrar },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(String(data.error))
  if (data?.dispositivo) localStorage.setItem(CHAVE_APARELHO, String(data.dispositivo))
}

/** Troca o segredo do aparelho por uma sessão liberada. `false` = precisa do código. */
async function tentarAparelho(): Promise<boolean> {
  const token = aparelhoLembrado()
  if (!token || !supabase) return false
  const { data, error } = await supabase.functions.invoke('dois-fatores', {
    body: { acao: 'dispositivo', token },
  })
  // Só a recusa DITA PELO SERVIDOR (revogado, vencido, de outro dono) mata o token.
  // Falha de transporte (rede, edge fria) não prova nada — apagar aqui destruía a
  // confiança boa e o aparelho voltava a pedir código para sempre.
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    esquecerAparelho()
    return false
  }
  if (error) return false
  return data?.ok === true
}

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
    if ((data ?? []).some((r) => r.session_id === idAtual)) return setEstado('liberado')
    // Ainda não liberada: se este aparelho já foi confiado, ele libera sem e-mail nenhum.
    setEstado((await tentarAparelho()) ? 'liberado' : 'pendente')
  }, [])

  useEffect(() => {
    void revalidar()
    if (!supabase) return
    // O login acontece DEPOIS do mount. Sem este listener, a única checagem rodava antes
    // de existir sessão — o aparelho confiável nunca era tentado e a tela do código
    // aparecia sempre (5 tokens emitidos, 0 resgatados em prod, 2026-07-29).
    const { data: escuta } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_IN') {
        // SIGNED_IN também dispara ao REFOCAR a guia do navegador — sessão já liberada
        // revalida em silêncio, sem regredir a tela pro splash de carregamento (report
        // 2026-07-30). O portão visual só vale enquanto ainda não passou pelo 2FA.
        setEstado((atual) => (atual === 'liberado' ? atual : 'checando'))
        // FORA do callback (setTimeout 0): o handler roda segurando o lock de auth da
        // supabase-js, e o revalidar chama getSession — que espera o MESMO lock.
        // Chamar direto deadlocka e o app fica no "Carregando…" pra sempre em todo
        // login (regressão de 2026-07-29, vista em prod 2026-07-30).
        setTimeout(() => void revalidar(), 0)
      }
    })
    return () => escuta.subscription.unsubscribe()
  }, [revalidar])

  return { estado, revalidar }
}
