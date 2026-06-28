/** @file Mini-gráfico de linha (sparkline) com linha de média tracejada — SVG puro. */

const W = 96
const H = 24
const PAD = 2

export function Sparkline({
  valores,
  cor = 'rgb(var(--c-secondary))',
  classe = 'h-6 w-24 shrink-0',
}: {
  valores: readonly number[]
  cor?: string
  classe?: string
}) {
  if (valores.length < 2) return <span className="inline-block w-24 text-center text-[9px] text-muted">sem série</span>
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const span = max - min || 1
  const media = valores.reduce((s, v) => s + v, 0) / valores.length
  const x = (i: number) => PAD + (i / (valores.length - 1)) * (W - 2 * PAD)
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD)
  const d = valores.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={classe} aria-hidden>
      <line x1={PAD} y1={y(media)} x2={W - PAD} y2={y(media)} stroke="rgb(var(--c-warn))" strokeWidth="1" strokeDasharray="2 3" strokeOpacity="0.7" />
      <path d={d} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
