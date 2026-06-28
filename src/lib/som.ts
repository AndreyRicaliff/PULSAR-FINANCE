/**
 * @file Identidade sonora Pulsar Finance — sons sintetizados via Web Audio, sem arquivos.
 * Assinatura herdada do PULSAR-RH: pulso grave (thump) + acorde de sucesso arpejado.
 * Padrão crítico (memória PULSAR-RH): criar o AudioContext NO GESTO do usuário, ANTES de
 * qualquer await — criado depois da rede o contexto nasce suspenso e o som não toca.
 */

/** Master de som da família Pulsar: OFF por padrão (corporativo); liga via opt-in 'pulsar-som'='1'. */
export const somLigado = (): boolean => localStorage.getItem('pulsar-som') === '1'

export function criarAudio(): AudioContext | null {
  try {
    return new AudioContext()
  } catch {
    return null
  }
}

function retomar(c: AudioContext): void {
  if (c.state === 'suspended') void c.resume().catch(() => undefined)
}

/** Pulso grave (90→40Hz, 0.4s) — o "batimento" da marca; toca na entrada. */
export function somPulso(ctx?: AudioContext | null): void {
  if (!somLigado()) return
  const c = ctx ?? criarAudio()
  if (!c) return
  retomar(c)
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(90, t)
  o.frequency.exponentialRampToValueAtTime(40, t + 0.4)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.16, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 0.5)
}

// ── Música ambiente (mesmo motivo do PULSAR-RH: arpejo lento em Dó menor, gain 0.032) ──

let ambienteCtx: AudioContext | null = null
let ambienteTimer: ReturnType<typeof setTimeout> | null = null

const NOTAS_AMBIENTE = [130.81, 155.56, 196, 233.08, 293.66, 196, 233.08, 155.56] as const

export function iniciarMusicaAmbiente(): void {
  if (!somLigado()) return
  if (ambienteCtx) return
  ambienteCtx = criarAudio()
  if (!ambienteCtx) return
  let batida = 0
  const tocar = () => {
    const c = ambienteCtx
    if (!c || c.state === 'closed') return
    retomar(c)
    const t = c.currentTime
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(NOTAS_AMBIENTE[batida % NOTAS_AMBIENTE.length]!, t)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.016, t + 0.4)
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.2)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + 2.5)
    batida += 1
    ambienteTimer = setTimeout(tocar, 2400)
  }
  tocar()
}

export function pararMusicaAmbiente(): void {
  if (ambienteTimer) clearTimeout(ambienteTimer)
  ambienteTimer = null
  if (ambienteCtx) {
    void ambienteCtx.close().catch(() => undefined)
    ambienteCtx = null
  }
}

export function musicaAmbienteAtiva(): boolean {
  return ambienteCtx !== null
}

/** Acorde de sucesso (C4–G4–C5 arpejado, mesmo do PULSAR-RH) — login OK, sync OK. */
export function somSucesso(ctx?: AudioContext | null): void {
  if (!somLigado()) return
  const c = ctx ?? criarAudio()
  if (!c) return
  retomar(c)
  const t = c.currentTime
  for (const [i, freq] of [261.63, 392, 523.25].entries()) {
    const ini = t + i * 0.18
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(freq, ini)
    g.gain.setValueAtTime(0, ini)
    g.gain.linearRampToValueAtTime(0.09, ini + 0.12)
    g.gain.exponentialRampToValueAtTime(0.001, ini + 1.6)
    o.connect(g).connect(c.destination)
    o.start(ini)
    o.stop(ini + 1.8)
  }
}

// ── SFX de navegação (console-style: tick PS5 / thock Xbox) ──────────────────
let _ultimoTick = 0

function _tom(freq: number, dur: number, gain: number, tipo: OscillatorType, freqFim?: number): void {
  const ctx = criarAudio()
  if (!ctx) return
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(freq, t)
  if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(ctx.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** Tick sutil de hover — com throttle para não metralhar em listas. */
export function somTick(): void {
  if (!somLigado()) return
  const agora = performance.now()
  if (agora - _ultimoTick < 70) return
  _ultimoTick = agora
  _tom(1900, 0.035, 0.006, 'triangle')
}

/** Confirmação de seleção (troca de aba/painel). */
export function somSelecao(): void {
  if (!somLigado()) return
  _tom(740, 0.07, 0.012, 'sine', 540)
}
