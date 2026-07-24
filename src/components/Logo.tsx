/**
 * @file Marca Pulsar Finance — gramática visual da família PulsaRH (PDF de marca):
 * wordmark itálico com a 2ª palavra em roxo e linha de EKG saindo da última letra;
 * o hexágono com batimento é o ícone compacto (favicon/avatar).
 */
interface MarkProps {
  readonly size?: number
}

/**
 * Símbolo cardíaco v3.1 (§3): anel + EKG atravessando + anel de pulso emanando.
 * Sem ponto central — o hexágono da geração anterior saiu com o rebrand.
 * viewBox 26 para casar exatamente com o traçado canônico do site de apresentação.
 */
const EKG = 'M1 13 H8 l1.5 -2.5 l2 4.5 l2 -8 l2.5 10.5 l2 -6 l1 2 H25'

interface MarcaProps extends MarkProps {
  /** Splash: o anel se desenha e o EKG se traça antes do batimento assumir. */
  readonly intro?: boolean
}

export function LogoMark({ size = 36, intro = false }: MarcaProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      role="img"
      aria-label="Pulsar Finance"
      className={`shrink-0 ${intro ? 'pm-intro' : ''}`}
    >
      <defs>
        <linearGradient id="pulsar-ekg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7048E8" />
          <stop offset="1" stopColor="#A55EFF" />
        </linearGradient>
      </defs>
      {/* anel de contorno */}
      <circle className="pm-ring" cx="13" cy="13" r="9.5" stroke="var(--c-ring)" strokeOpacity="0.4" strokeWidth="1" />
      {/* anel de pulso que EMANA (o "lub-dub") */}
      <circle className="pm-ping" cx="13" cy="13" r="4" stroke="var(--c-ring)" strokeWidth="1" fill="none" />
      {/* traçado do batimento */}
      <path
        className="pm-ekg"
        d={EKG}
        stroke="url(#pulsar-ekg)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* blip claro percorrendo o traçado, como monitor cardíaco */}
      <path
        className="pm-ekg2"
        d={EKG}
        pathLength={100}
        stroke="rgb(var(--c-text))"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
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
