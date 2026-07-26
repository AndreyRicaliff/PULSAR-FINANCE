/**
 * @file Apresentação do produto na ENTRADA (padrão do PULSAR-RH): cartão fixo no canto
 * ("Conheça o Pulsar Finance") que abre um overlay com carrossel de benefícios — o
 * "vídeo de 90 segundos" do RH é isto, um palco animado + 6 slides que avançam sozinhos.
 * Dispensar o cartão persiste por navegador; Esc/backdrop fecham o overlay.
 */
import { useCallback, useEffect, useState } from 'react'
import { somSelecao } from '@/lib/som'
import { LogoMark } from './Logo.tsx'

const CHAVE_DISPENSADO = 'pulsar-fin-intro-mini-dispensado'
const AVANCO_MS = 5000

interface Beneficio {
  readonly icone: string
  readonly titulo: string
  readonly texto: string
}

// Benefícios REAIS do produto — nada prometido que a tela não faça hoje.
const BENEFICIOS: readonly Beneficio[] = [
  {
    icone: 'M3 21h18M5 21V11M10 21V7M15 21V13M20 21V5',
    titulo: 'DRE e DFC montados sozinhos',
    texto: 'Sincronize Omie ou Nibo e as demonstrações aparecem prontas — sem planilha e sem redigitação.',
  },
  {
    icone: 'M9 11l3 3 8-8M21 12a9 9 0 1 1-2.6-6.3',
    titulo: 'Concilie uma vez, nunca refaça',
    texto: 'A classificação fica presa à categoria do plano: cada nova sincronização já entra classificada.',
  },
  {
    icone: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h4',
    titulo: 'Relatórios executivos prontos',
    texto: 'Custos, receita, capital de giro, filiais e previsto × realizado — no padrão AG, direto da tela.',
  },
  {
    icone: 'M3 4h18v11H3zM12 15v5M8 20h8',
    titulo: 'Apresentação mensal em um clique',
    texto: 'Exporta um arquivo navegável que abre offline, pronto para enviar ao cliente.',
  },
  {
    icone: 'M15.5 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM13 10.5L4 19.5M7 16.5l2 2',
    titulo: 'Multi-empresa com isolamento real',
    texto: 'Cada cliente enxerga só o próprio painel; quem controla o acesso é a AG.',
  },
  {
    icone: 'M3 17l5-5 3 3 7-8M15 7h4v4',
    titulo: 'Do total ao lançamento',
    texto: 'Qualquer número abre em detalhe até o movimento original no ERP — sem caixa-preta.',
  },
]

/** Palco animado compartilhado entre a miniatura e o overlay (orbs + anéis + EKG). */
function Palco({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <span className="lp-orb lp-orb--a" />
      <span className="lp-orb lp-orb--b" />
      <span className="lp-anel" />
      <span className="lp-anel" />
      <span className="lp-anel" />
      <svg className="lp-ekg w-full" viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="lpGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7048E8" stopOpacity="0" />
            <stop offset="0.3" stopColor="#7048E8" />
            <stop offset="0.7" stopColor="#A55EFF" />
            <stop offset="1" stopColor="#A55EFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points="0,30 180,30 220,26 240,30 256,18 270,42 286,30 400,30 520,30 540,26 560,30 576,18 590,42 606,30 800,30" pathLength={860} />
        <polyline className="lp-varre" points="0,30 180,30 220,26 240,30 256,18 270,42 286,30 400,30 520,30 540,26 560,30 576,18 590,42 606,30 800,30" pathLength={860} stroke="url(#lpGrad)" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </>
  )
}

export function LoginIntro() {
  const [dispensado, setDispensado] = useState(() => localStorage.getItem(CHAVE_DISPENSADO) === '1')
  const [aberto, setAberto] = useState(false)

  const dispensar = () => {
    localStorage.setItem(CHAVE_DISPENSADO, '1')
    setDispensado(true)
  }
  const abrir = () => {
    somSelecao()
    setAberto(true)
  }

  return (
    <>
      {!dispensado && !aberto ? (
        <aside className="login-promo" role="dialog" aria-label="Conheça o Pulsar Finance">
          <button type="button" className="login-promo__fechar" onClick={dispensar} aria-label="Fechar">
            ×
          </button>
          <button type="button" className="lp-thumb block w-full" onClick={abrir} aria-label="Abrir apresentação">
            <Palco>
              <span className="lp-play">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.6)" stroke="rgba(255,255,255,.5)" strokeWidth="1" />
                  <path d="M10 8.5v7l5.5-3.5L10 8.5z" fill="#fff" />
                </svg>
              </span>
            </Palco>
          </button>
          <div className="login-promo__corpo">
            <p className="login-promo__eyebrow">Conheça o Pulsar Finance</p>
            <p className="login-promo__titulo">O pulso financeiro da sua operação em 90 segundos</p>
            <button type="button" className="login-promo__cta" onClick={abrir}>
              Saiba mais →
            </button>
          </div>
        </aside>
      ) : null}
      {aberto ? <IntroOverlay onFechar={() => setAberto(false)} /> : null}
    </>
  )
}

function IntroOverlay({ onFechar }: { onFechar: () => void }) {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  // Avanço automático — clicar num dot reancora o timer (o efeito reroda ao mudar o índice).
  useEffect(() => {
    const t = setTimeout(() => setIndice((i) => (i + 1) % BENEFICIOS.length), AVANCO_MS)
    return () => clearTimeout(t)
  }, [indice])

  const b = BENEFICIOS[indice]!
  return (
    <div className="login-intro" role="dialog" aria-label="Apresentação do Pulsar Finance">
      <button type="button" className="login-intro__backdrop" onClick={onFechar} aria-label="Fechar apresentação" />
      <div className="login-intro__modal">
        <div className="login-intro__palco">
          <Palco />
          <div className="login-intro__marca">
            <LogoMark size={40} />
            <div>
              <p className="text-sm font-bold tracking-wide">
                PULSAR <span className="text-secondary">FINANCE</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">BPO financeiro · DRE · DFC</p>
            </div>
          </div>
        </div>
        <div className="login-intro__lado">
          <p className="login-intro__contador">
            {String(indice + 1).padStart(2, '0')} / {String(BENEFICIOS.length).padStart(2, '0')}
          </p>
          <div key={indice} className="anim-fade-up flex flex-col gap-3">
            <span className="login-intro__icone">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={b.icone} />
              </svg>
            </span>
            <h3 className="text-lg font-semibold leading-snug">{b.titulo}</h3>
            <p className="text-sm leading-relaxed text-muted">{b.texto}</p>
          </div>
          <div className="login-intro__dots" role="tablist" aria-label="Slides">
            {BENEFICIOS.map((item, i) => (
              <button
                key={item.titulo}
                type="button"
                aria-current={i === indice}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndice(i)}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <button type="button" onClick={onFechar} className="login-btn fx-press">
              Fazer login
            </button>
            <button type="button" onClick={onFechar} className="text-xs text-muted transition-colors hover:text-text">
              Fechar apresentação
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
