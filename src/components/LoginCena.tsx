/**
 * @file Cena de fundo do login — todo o efeito visual mora AQUI (efeitos só no login).
 * Candlestick de pregão esmaecido cobrindo o fundo (random walk real, sem loop), orbes de
 * energia, EKG correndo e piso de radar 3D (ripple único). Decorativo puro: nenhum número.
 */
import { useEffect, useState } from 'react'

export function CenaPulso() {
  return (
    <>
      <div className="orbe orbe-a" aria-hidden />
      <div className="orbe orbe-b" aria-hidden />
      <CandlesFundo />
      <EkgAmbiente />
      <div className="pulso-piso" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </>
  )
}

// ── Candlestick ambiente: gráfico de velas estilo bolsa, esmaecido, andando sem padrão ──

const QTD = 48
const PASSO = 10
const LARGURA = QTD * PASSO
const ALTURA = 130
const TOPO_VOLUME = 112

interface Vela {
  readonly abre: number
  readonly fecha: number
  readonly alta: number
  readonly baixa: number
  readonly vol: number
}

/** Próxima vela por random walk com leve puxão pro centro (não deriva pra fora da tela). */
function novaVela(nivelAnterior: number): Vela {
  const abre = nivelAnterior
  const puxao = (55 - abre) * 0.06
  const fecha = abre + (Math.random() - 0.5) * 14 + puxao
  return {
    abre,
    fecha,
    alta: Math.max(abre, fecha) + Math.random() * 6,
    baixa: Math.min(abre, fecha) - Math.random() * 6,
    vol: 3 + Math.random() * 14,
  }
}

function serieInicial(): Vela[] {
  const velas: Vela[] = []
  let nivel = 55
  for (let i = 0; i < QTD; i += 1) {
    const v = novaVela(nivel)
    nivel = v.fecha
    velas.push(v)
  }
  return velas
}

/** Média móvel (8) dos fechamentos — a linha azul que corta as velas. */
function mediaMovel(velas: readonly Vela[]): string {
  return velas
    .map((_, i) => {
      const janela = velas.slice(Math.max(0, i - 7), i + 1)
      const m = janela.reduce((s, v) => s + v.fecha, 0) / janela.length
      return `${i * PASSO + PASSO / 2},${(100 - m).toFixed(1)}`
    })
    .join(' ')
}

function CandlesFundo() {
  const [velas, setVelas] = useState<Vela[]>(serieInicial)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => {
      setVelas((vs) => [...vs.slice(1), novaVela(vs[vs.length - 1]!.fecha)])
    }, 1100)
    return () => clearInterval(timer)
  }, [])

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.13]"
      aria-hidden
    >
      {velas.map((v, i) => (
        <Candle key={`${i}-${v.abre.toFixed(2)}`} v={v} x={i * PASSO} />
      ))}
      <polyline
        points={mediaMovel(velas)}
        fill="none"
        stroke="rgb(var(--c-info))"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Candle({ v, x }: { v: Vela; x: number }) {
  const sobe = v.fecha >= v.abre
  const cor = sobe ? 'rgb(var(--c-accent))' : 'rgb(var(--c-danger))'
  // Preço plota invertido (y cresce pra baixo); corpo mínimo de 1 pra vela doji não sumir.
  const topoCorpo = 100 - Math.max(v.abre, v.fecha)
  const corpo = Math.max(1, Math.abs(v.fecha - v.abre))
  const cx = x + PASSO / 2
  return (
    <g fill={cor} stroke={cor}>
      <line x1={cx} y1={100 - v.alta} x2={cx} y2={100 - v.baixa} strokeWidth="1" />
      <rect x={x + 2} y={topoCorpo} width={PASSO - 4} height={corpo} strokeWidth="0" />
      <rect x={x + 2} y={TOPO_VOLUME + (14 - v.vol)} width={PASSO - 4} height={v.vol} strokeWidth="0" opacity="0.7" />
    </g>
  )
}

/** Batimento atravessando a tela atrás do card — o traço corre via stroke-dashoffset. */
function EkgAmbiente() {
  // Padrão de batimento repetido 4×, 1840 unidades de largura (espelha a janela inteira).
  const batida = 'h150 l14 -16 l16 30 l16 -52 l16 62 l16 -36 l12 12 h160'
  return (
    <svg className="ekg-ambiente" viewBox="0 0 1840 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="ekg-amb-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgb(var(--c-primary))" stopOpacity="0" />
          <stop offset="0.2" stopColor="rgb(var(--c-primary))" />
          <stop offset="0.5" stopColor="rgb(var(--c-secondary))" />
          <stop offset="0.8" stopColor="rgb(var(--c-primary))" />
          <stop offset="1" stopColor="rgb(var(--c-primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M0 58 ${batida} ${batida} ${batida} ${batida}`}
        fill="none"
        stroke="url(#ekg-amb-g)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
