/**
 * @file Fluxo do link de convite/recuperação, à prova de scanner de e-mail:
 * — Intermediária (?convite=<verify-url>): Outlook/Hotmail pré-visitam links e queimavam o
 *   token de uso único antes do clique humano. O e-mail aponta pra cá; SÓ o clique no botão
 *   dispara a verificação no GoTrue. Guarda anti-open-redirect: a URL precisa ser o endpoint
 *   /auth/v1/verify do NOSSO projeto Supabase.
 * — Link expirado (#error_code=otp_expired): antes o app engolia o erro e mostrava o login
 *   sem explicação. Agora explica e reenvia por self-service (resetPasswordForEmail — sem
 *   enumeração: a resposta é a mesma existindo ou não o e-mail).
 */
import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

const CLASSE_INPUT =
  'rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary'

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg p-4">
      <div className="anim-pop w-full max-w-sm rounded-card border border-bd border-t-2 border-t-primary bg-surface p-6">
        <p className="text-lg font-extrabold italic">
          <span className="text-primary">Pulsar</span>
          <span className="text-secondary">Finance</span>
        </p>
        {children}
      </div>
    </div>
  )
}

/** A URL só é aceita se for o verify do nosso Supabase — nunca redirecionar pra terceiros. */
function verifyValida(url: string): boolean {
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? '')
  return base !== '' && url.startsWith(`${base.replace(/\/$/, '')}/auth/v1/verify`)
}

export function ConviteInterstitial({ verifyUrl }: { verifyUrl: string }) {
  if (!verifyValida(verifyUrl)) {
    return (
      <Moldura>
        <h1 className="mt-3 text-[17px] font-semibold">Link inválido</h1>
        <p className="mt-1 text-sm text-muted">Este convite não é deste painel. Peça um novo à AG.</p>
      </Moldura>
    )
  }
  return (
    <Moldura>
      <h1 className="mt-3 text-[17px] font-semibold">Seu acesso está pronto</h1>
      <p className="mt-1 text-sm text-muted">
        Clique abaixo para confirmar o convite e definir a sua senha. O botão vale uma vez —
        se expirar, dá para pedir outro na hora.
      </p>
      <a
        href={verifyUrl}
        className="fx-press mt-5 block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white"
      >
        Definir minha senha
      </a>
    </Moldura>
  )
}

export function LinkExpirado() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function reenviar(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setErro('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    if (error) {
      setErro('Não foi possível reenviar agora — tente em alguns minutos.')
      setEnviando(false)
      return
    }
    setEnviado(true)
  }

  return (
    <Moldura>
      <h1 className="mt-3 text-[17px] font-semibold">Este link já foi usado ou expirou</h1>
      {enviado ? (
        <p className="mt-1 text-sm text-muted">
          Se o e-mail estiver cadastrado, um novo link acabou de ser enviado. Abra a mensagem mais
          recente e clique em seguida.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Links de convite valem uma única vez (alguns provedores de e-mail os visitam antes de
            você). Digite seu e-mail para receber um novo.
          </p>
          <form onSubmit={(e) => void reenviar(e)} className="mt-4 flex flex-col gap-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com.br" className={CLASSE_INPUT} />
            {erro ? <p className="text-[13px] text-danger">{erro}</p> : null}
            <button type="submit" disabled={enviando} className="fx-press rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {enviando ? 'Enviando…' : 'Enviar novo link'}
            </button>
          </form>
        </>
      )}
      <p className="mt-4 text-xs text-muted">
        <a href={window.location.origin} className="underline underline-offset-2 hover:text-text">Ir para o login</a>
      </p>
    </Moldura>
  )
}
