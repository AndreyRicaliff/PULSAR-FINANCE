/** @file Modal "Definir senha": o próprio usuário logado escolhe sua senha (updateUser). */
import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { definirSenha } from '@/lib/auth'

export function DefinirSenha({ email, onFechar }: { email?: string; onFechar: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 6) return setErro('A senha precisa ter ao menos 6 caracteres.')
    if (senha !== confirma) return setErro('As senhas não conferem.')
    setErro('')
    setCarregando(true)
    try {
      await definirSenha(senha)
      setOk(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao definir a senha.')
    } finally {
      setCarregando(false)
    }
  }

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div className="anim-pop w-full max-w-sm rounded-card border border-bd bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Definir senha</h2>
        <p className="mt-1 text-sm text-muted">
          {email ? <span className="font-medium text-text">{email}</span> : 'Sua conta'} — escolha uma senha para
          entrar com e-mail e senha da próxima vez.
        </p>
        {ok ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-accent">Senha definida ✓ Já pode sair e entrar com e-mail e senha.</p>
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-white"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={salvar} className="mt-4 flex flex-col gap-3">
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Nova senha (mín. 6)"
              autoComplete="new-password"
              autoFocus
              required
              className="rounded-lg border border-bd bg-surface2 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              placeholder="Confirmar senha"
              autoComplete="new-password"
              required
              className="rounded-lg border border-bd bg-surface2 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            {erro ? <p className="anim-shake text-xs text-danger">{erro}</p> : null}
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={onFechar}
                className="flex-1 rounded-lg border border-bd bg-surface2 px-4 py-2 text-sm text-muted hover:text-text"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={carregando}
                className="flex-1 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {carregando ? '…' : 'Salvar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
