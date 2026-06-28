/**
 * @file Login e criação de conta (Supabase Auth) — porta de entrada com a identidade de pulso:
 * piso de radar 3D, tilt do card seguindo o mouse (GPU only), aviso de Caps Lock, olho de senha
 * e acorde de sucesso (AudioContext criado no gesto, antes do await).
 */
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { cadastrar, entrar } from '@/lib/auth'
import { criarAudio, somSucesso } from '@/lib/som'
import { CenaPulso } from './LoginCena.tsx'
import { Logo, Tagline } from './Logo.tsx'

type Modo = 'entrar' | 'criar'

export function Login() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [capsAtivo, setCapsAtivo] = useState(false)
  const tilt = useTilt3d()

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    setAviso('')
    // AudioContext no GESTO, antes do await — criado depois da rede nasce suspenso (padrão PULSAR-RH).
    const audio = criarAudio()
    try {
      if (modo === 'entrar') {
        await entrar(email, senha)
        somSucesso(audio)
      } else {
        const { logado } = await cadastrar(email, senha)
        if (logado) somSucesso(audio)
        else {
          setAviso('Conta criada! Se o login não entrar, a confirmação de e-mail precisa ser desativada no projeto — me avise.')
          setModo('entrar')
        }
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha')
    } finally {
      setCarregando(false)
    }
  }

  function verificarCaps(e: KeyboardEvent<HTMLInputElement>) {
    setCapsAtivo(e.getModifierState('CapsLock'))
  }

  const criando = modo === 'criar'
  return (
    <Centro>
      <div
        ref={tilt.ref}
        onMouseMove={tilt.aoMover}
        onMouseLeave={tilt.aoSair}
        className="anim-pop fx-border-glow pulso-borda tilt-3d relative flex w-full max-w-sm flex-col items-center gap-4 rounded-card p-8"
      >
      <span className="pulso-respira">
        <Logo size={48} subtitulo="" />
      </span>
      <Tagline />
      <form onSubmit={submeter} className="mt-2 flex w-full max-w-xs flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          autoComplete="username"
          required
          className="rounded-lg border border-bd bg-surface2 px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <div className="relative">
          <input
            type={mostrarSenha ? 'text' : 'password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={verificarCaps}
            onKeyUp={verificarCaps}
            placeholder="Senha"
            autoComplete={criando ? 'new-password' : 'current-password'}
            required
            className="w-full rounded-lg border border-bd bg-surface2 py-2.5 pl-4 pr-11 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-text"
          >
            {mostrarSenha ? <IconeOlhoCortado /> : <IconeOlho />}
          </button>
        </div>
        {capsAtivo ? (
          <p className="anim-fade-in flex items-center gap-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-1.5 text-xs text-warn">
            <IconeCaps /> Caps Lock está ativado
          </p>
        ) : null}
        {erro ? <p className="anim-shake text-xs text-danger">{erro}</p> : null}
        {aviso ? <p className="text-xs text-accent">{aviso}</p> : null}
        <button
          type="submit"
          disabled={carregando}
          className="fx-sheen fx-press rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {carregando ? '…' : criando ? 'Criar conta' : 'Entrar'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setModo(criando ? 'entrar' : 'criar')
          setErro('')
          setAviso('')
        }}
        className="text-xs text-muted hover:text-text"
      >
        {criando ? 'Já tenho conta — Entrar' : 'Criar primeira conta'}
      </button>
      </div>
    </Centro>
  )
}

/** Tilt 3D do card: rotateX/Y a partir da posição do cursor, mutando style direto (sem re-render). */
function useTilt3d() {
  const ref = useRef<HTMLDivElement>(null)

  function aoMover(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg) translateZ(8px)`
  }
  function aoSair() {
    if (ref.current) ref.current.style.transform = ''
  }
  return { ref, aoMover, aoSair }
}

export function Carregando() {
  return (
    <Centro>
      <span className="pulso-respira">
        <Logo size={48} subtitulo="" />
      </span>
      <p className="text-sm text-muted">Carregando…</p>
    </Centro>
  )
}

function Centro({ children }: { children: ReactNode }) {
  return (
    <div className="fx-grid-bg relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-bg p-6">
      <CenaPulso />
      <div className="relative flex w-full flex-col items-center gap-4">{children}</div>
    </div>
  )
}

function IconeOlho() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconeOlhoCortado() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconeCaps() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l8 8h-5v6H9v-6H4l8-8z" />
      <path d="M9 21h6" />
    </svg>
  )
}
