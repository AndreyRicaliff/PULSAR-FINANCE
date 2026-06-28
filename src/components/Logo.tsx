/**
 * @file Marca Pulsar Finance — gramática visual da família PulsaRH (PDF de marca):
 * wordmark itálico com a 2ª palavra em roxo e linha de EKG saindo da última letra;
 * o hexágono com batimento é o ícone compacto (favicon/avatar).
 */
interface MarkProps {
  readonly size?: number
}

// Hexágono pointy-top r=16.5 centrado em (20,20); o stroke grosso com join round arredonda os cantos.
const HEX = 'M20 3.5 L34.29 11.75 V28.25 L20 36.5 L5.71 28.25 V11.75 Z'
const HEX_INTERNO = 'M20 7 L31.26 13.5 V26.5 L20 33 L8.74 26.5 V13.5 Z'
// Batimento: baseline → spike pra cima → vale → recupera — o "pulso" da marca.
const EKG = 'M9 20 H14 L17 13.5 L21 26.5 L24 15 L26 20 H31'

/** Ícone "pulsar" gamer: hexágono com glow + EKG branco cortando o centro. */
export function LogoMark({ size = 36 }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Pulsar Finance"
      className="shrink-0"
      style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.25))' }}
    >
      <defs>
        <linearGradient id="pulsar-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--c-primary))" />
          <stop offset="1" stopColor="rgb(var(--c-secondary))" />
        </linearGradient>
      </defs>
      <path d={HEX} fill="url(#pulsar-g)" stroke="url(#pulsar-g)" strokeWidth="3" strokeLinejoin="round" />
      <path d={HEX_INTERNO} stroke="white" strokeOpacity="0.14" strokeWidth="1" strokeLinejoin="round" />
      <path d={EKG} stroke="white" strokeOpacity="0.35" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={EKG} stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="26.5" r="1.6" fill="white" />
    </svg>
  )
}

/** Rastro de EKG que sai da última letra do wordmark (assinatura PulsaRH). */
export function EkgTrail({ altura = 14 }: { altura?: number }) {
  return (
    <svg
      width={altura * 2.6}
      height={altura}
      viewBox="0 0 66 24"
      fill="none"
      aria-hidden
      className="shrink-0 self-end text-secondary"
      style={{ marginBottom: 1 }}
    >
      <path
        d="M0 14 H10 L13 10 L16 17 L19 3 L22 21 L25 11 L27 14 H64"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface WordmarkProps {
  /** Classe de tamanho do texto (ex.: 'text-base', 'text-3xl'). */
  readonly classe?: string
}

/** Wordmark "Pulsar Finance": itálico pesado, Finance em roxo, EKG saindo do final. */
export function Wordmark({ classe = 'text-base' }: WordmarkProps) {
  return (
    <span className={`flex items-end ${classe} font-titulo font-bold italic leading-none tracking-tight`}>
      <span>Pulsar</span>
      <span className="ml-1 text-secondary">Finance</span>
      <EkgTrail />
    </span>
  )
}

interface LogoProps {
  readonly size?: number
  readonly subtitulo?: string
}

export function Logo({ size = 36, subtitulo = 'AG Consultoria' }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div className="flex flex-col gap-1 leading-tight">
        <Wordmark />
        {subtitulo ? (
          <p className="text-[11px] font-medium uppercase tracking-wider text-secondary">{subtitulo}</p>
        ) : null}
      </div>
    </div>
  )
}

/** Tagline da família: o ✦ (núcleo do pulsar) substitui o "o" de "puls✦", como no PDF da marca. */
export function Tagline() {
  return (
    <p className="text-sm text-muted">
      Sinta o puls<span className="not-italic text-secondary">✦</span> da sua operação financeira
    </p>
  )
}
