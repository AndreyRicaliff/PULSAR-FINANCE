/**
 * @file Tela do segundo fator: pede o código de 6 dígitos que chegou por e-mail.
 * Mora entre o login e o painel — a sessão já existe, mas a RLS não libera nada até aqui.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { sair } from '@/lib/auth'
import { enviarCodigo, verificarCodigo } from '@/lib/doisFatores'
import { Logo } from './Logo.tsx'

export function CodigoAcesso({ onLiberado }: { onLiberado: () => Promise<void> }) {
  const [codigo, setCodigo] = useState('')
  const [destino, setDestino] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(true)
  const [verificando, setVerificando] = useState(false)
  // Ligado por padrão: quem entra é o próprio time no próprio aparelho. Em máquina
  // compartilhada o usuário desmarca — por isso o aviso está colado na caixa.
  const [lembrar, setLembrar] = useState(true)
  const pediu = useRef(false)

  // Pede o código UMA vez ao montar (StrictMode monta duas vezes em dev — o ref evita
  // dois e-mails e o freio de 45s da edge respondendo "aguarde" na cara do usuário).
  useEffect(() => {
    if (pediu.current) return
    pediu.current = true
    enviarCodigo()
      .then(setDestino)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao enviar o código'))
      .finally(() => setEnviando(false))
  }, [])

  async function reenviar() {
    setErro('')
    setEnviando(true)
    try {
      setDestino(await enviarCodigo())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao reenviar')
    } finally {
      setEnviando(false)
    }
  }

  async function submeter(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setVerificando(true)
    try {
      await verificarCodigo(codigo, lembrar)
      await onLiberado()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Código inválido')
      setCodigo('')
      setVerificando(false)
    }
  }

  return (
    <div className="login-fundo fx-grid-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg p-6">
      <div className="relative flex w-full max-w-[440px] flex-col items-center gap-4">
        <header className="mb-1 flex flex-col items-center gap-2 text-center">
          <Logo size={56} subtitulo="" />
        </header>

        <form onSubmit={submeter} className="login-card anim-pop flex flex-col gap-4">
          <div>
            <h1 className="text-base font-semibold">Confirme que é você</h1>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {destino ? (
                <>
                  Enviamos um código de 6 dígitos para <strong className="text-text">{destino}</strong>.
                </>
              ) : (
                'Enviamos um código de 6 dígitos para o e-mail da sua conta.'
              )}
            </p>
          </div>

          <div>
            <label className="login-label" htmlFor="campo-codigo">
              Código
            </label>
            <input
              id="campo-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
              required
              className="login-input text-center text-2xl font-semibold tabular-nums tracking-[0.4em]"
            />
          </div>

          {erro ? (
            <p className="anim-shake rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
              {erro}
            </p>
          ) : null}

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#7048E8]"
            />
            <span>
              Confiar neste aparelho por 30 dias
              <span className="mt-0.5 block text-[11px] text-muted/70">
                Não marque em computador compartilhado.
              </span>
            </span>
          </label>

          <button type="submit" disabled={verificando || codigo.length !== 6} className="login-btn fx-press">
            {verificando ? 'Conferindo…' : 'Entrar'}
          </button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={reenviar}
              disabled={enviando}
              className="font-medium text-muted transition-colors hover:text-text disabled:opacity-50"
            >
              {enviando ? 'Enviando…' : 'Reenviar código'}
            </button>
            <button
              type="button"
              onClick={() => void sair()}
              className="font-medium text-muted transition-colors hover:text-text"
            >
              Sair
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
