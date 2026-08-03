/**
 * @file Tela do link de convite/recuperação (#type=recovery): o convidado define a própria
 * senha ANTES de entrar no app — sem isso o link caía direto no gate 2FA, sem senha definida.
 * Ao salvar: limpa o hash e recarrega (boot limpo → login normal com 2FA).
 */
import { useState, type FormEvent } from 'react'
import { definirSenha } from '@/lib/auth'

const CLASSE_INPUT =
  'rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary'

export function RecuperarSenha({ email }: { email: string }) {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 8) {
      setErro('Use ao menos 8 caracteres.')
      return
    }
    if (senha !== confirma) {
      setErro('As senhas não conferem.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      await definirSenha(senha)
      window.history.replaceState(null, '', window.location.pathname)
      window.location.reload()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a senha.')
      setSalvando(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-4">
      <div className="anim-pop w-full max-w-sm rounded-card border border-bd border-t-2 border-t-primary bg-surface p-6">
        <p className="text-lg font-extrabold italic">
          <span className="text-primary">Pulsar</span>
          <span className="text-secondary">Finance</span>
        </p>
        <h1 className="mt-3 text-[17px] font-semibold">Defina sua senha</h1>
        <p className="mt-1 text-sm text-muted">
          Seu acesso foi criado para <strong className="text-text">{email}</strong>. Escolha a senha
          que você vai usar para entrar.
        </p>
        <form onSubmit={(e) => void salvar(e)} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Nova senha</span>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoFocus minLength={8} autoComplete="new-password" className={CLASSE_INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Repita a senha</span>
            <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required minLength={8} autoComplete="new-password" className={CLASSE_INPUT} />
          </label>
          {erro ? <p className="text-[13px] text-danger">{erro}</p> : null}
          <button type="submit" disabled={salvando} className="fx-press mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {salvando ? 'Salvando…' : 'Salvar e entrar'}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">
          Depois de salvar, você entra normalmente — um código de verificação pode ser enviado ao seu
          e-mail no primeiro acesso.
        </p>
      </div>
    </div>
  )
}
