/**
 * @file Entrada do Pulsar Finance — mesma gramática do PULSAR-RH (marca grande, card com
 * blur e fio de luz, rótulos em caixa alta, CTA em gradiente), sobre os tokens v3.1.
 *
 * A porta é vitrine; o interior é ferramenta (§8.8) — por isso os efeitos vivem aqui e
 * não lá dentro. O tilt 3D do card saiu: é legado console (§8.7) e o RH não tem.
 */
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { entrar } from '@/lib/auth'
import { criarAudio, somSucesso } from '@/lib/som'
import { supabase } from '@/lib/supabase'
import { CenaPulso } from './LoginCena.tsx'
import { LoginIntro } from './LoginIntro.tsx'
import { PainelNovidades, useNovidades } from './Novidades.tsx'
import { Logo, Tagline } from './Logo.tsx'

type Status = 'checando' | 'ok' | 'erro'

/**
 * O RH mostra "Sistema operacional" na porta. Aqui o selo só acende depois de CONFIRMAR
 * que o backend responde — um indicador verde fixo seria decoração mentindo (§8.4). Quando
 * o servidor está fora, o usuário descobre antes de culpar a própria senha.
 */
function useStatusSistema(): Status {
  const [status, setStatus] = useState<Status>('checando')
  useEffect(() => {
    if (!supabase) return setStatus('erro')
    let vivo = true
    void supabase.auth
      .getSession()
      .then(() => vivo && setStatus('ok'))
      .catch(() => vivo && setStatus('erro'))
    return () => {
      vivo = false
    }
  }, [])
  return status
}

function SeloStatus() {
  const status = useStatusSistema()
  if (status === 'checando') return null
  const ok = status === 'ok'
  return (
    <span className={`login-status ${ok ? 'login-status--ok' : 'login-status--erro'}`} role="status">
      <i aria-hidden />
      {ok ? 'Sistema operacional' : 'Sem conexão com o servidor'}
    </span>
  )
}

export function Login() {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [capsAtivo, setCapsAtivo] = useState(false)

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    // AudioContext no GESTO, antes do await — criado depois da rede nasce suspenso (padrão PULSAR-RH).
    const audio = criarAudio()
    try {
      await entrar(login, senha)
      somSucesso(audio)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao entrar')
    } finally {
      setCarregando(false)
    }
  }

  function verificarCaps(e: KeyboardEvent<HTMLInputElement>) {
    setCapsAtivo(e.getModifierState('CapsLock'))
  }

  return (
    <Centro>
      <SeloStatus />

      <header className="mb-1 flex flex-col items-center gap-2 text-center">
        <Logo size={56} subtitulo="" />
        <Tagline />
      </header>

      <form onSubmit={submeter} className="login-card anim-pop flex flex-col gap-4">
        <div>
          <label className="login-label" htmlFor="campo-login">
            Login
          </label>
          <input
            id="campo-login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            required
            className="login-input"
          />
        </div>

        <div>
          <label className="login-label" htmlFor="campo-senha">
            Senha
          </label>
          <div className="relative">
            <input
              id="campo-senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={verificarCaps}
              onKeyUp={verificarCaps}
              autoComplete="current-password"
              required
              className="login-input pr-11"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-text"
            >
              {mostrarSenha ? <IconeOlhoCortado /> : <IconeOlho />}
            </button>
          </div>
          {capsAtivo ? (
            <p className="anim-fade-in mt-1.5 flex items-center gap-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-1.5 text-xs text-warn">
              <IconeCaps /> Caps Lock está ativado
            </p>
          ) : null}
        </div>

        {erro ? (
          <p className="anim-shake rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
            {erro}
          </p>
        ) : null}

        <button type="submit" disabled={carregando} className="login-btn fx-press">
          {carregando ? 'Entrando…' : <><IconeEntrar /> Entrar</>}
        </button>
      </form>

      <div className="login-rodape mt-6 text-center">
        <small>Feito por AG Consultoria</small>
        <span>Muito além da contabilidade</span>
        <NovidadesNoLogin />
      </div>

      <LoginIntro />
    </Centro>
  )
}

/** Log de atualizações acessível já na porta — dot lilás quando há entrada não lida. */
function NovidadesNoLogin() {
  const { temNaoLido, marcarVisto } = useNovidades()
  const [aberto, setAberto] = useState(false)
  return (
    <div>
      <button
        type="button"
        className="login-novidades"
        onClick={() => {
          marcarVisto()
          setAberto(true)
        }}
      >
        Novidades
        {temNaoLido ? <i className="mk-dot" aria-label="há novidades não lidas" /> : null}
      </button>
      {aberto ? <PainelNovidades onFechar={() => setAberto(false)} /> : null}
    </div>
  )
}

export function Carregando() {
  return (
    <Centro>
      <Logo size={56} subtitulo="" />
      <p className="text-sm text-muted">Carregando…</p>
    </Centro>
  )
}

function Centro({ children }: { children: ReactNode }) {
  return (
    <div className="login-fundo fx-grid-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg p-6">
      <div className="lp-piso" aria-hidden><span /><span /><span /></div>
      <span className="lp-anel lp-anel--tela" aria-hidden /><span className="lp-anel lp-anel--tela d2" aria-hidden /><span className="lp-anel lp-anel--tela d3" aria-hidden />
      <svg className="lp-ekg-tela" viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="lpGradTela" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7048E8" stopOpacity="0" />
            <stop offset="0.3" stopColor="#7048E8" />
            <stop offset="0.7" stopColor="#A55EFF" />
            <stop offset="1" stopColor="#A55EFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline className="lp-base" points="0,30 180,30 220,26 240,30 256,18 270,42 286,30 400,30 520,30 540,26 560,30 576,18 590,42 606,30 800,30" pathLength={860} />
        <polyline className="lp-varre" points="0,30 180,30 220,26 240,30 256,18 270,42 286,30 400,30 520,30 540,26 560,30 576,18 590,42 606,30 800,30" pathLength={860} stroke="url(#lpGradTela)" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <CenaPulso />
      <div className="relative flex w-full max-w-[440px] flex-col items-center gap-4">{children}</div>
    </div>
  )
}

function IconeEntrar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
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
