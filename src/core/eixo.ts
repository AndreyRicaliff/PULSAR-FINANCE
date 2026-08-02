/**
 * @file Escala de eixo de valor: passo "bonito" e rótulos compactos em R$.
 * Núcleo puro (testado) — o gráfico só desenha o que sai daqui.
 */

/** R$ compacto para eixo/rótulo: R$ 25k, -R$ 1,2M. O valor exato vive no tooltip. */
export function brlCompacto(v: number): string {
  const s = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (a >= 1_000_000) return `${s}R$ ${(a / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
  if (a >= 1_000) return `${s}R$ ${Math.round(a / 1_000)}k`
  return `${s}R$ ${Math.round(a)}`
}

/** Passo 1-2-5×10^k para ~`divisoes` faixas — números redondos, não 37.418,33. */
export function passoBonito(span: number, divisoes = 4): number {
  if (!Number.isFinite(span) || span <= 0) return 1
  const bruto = span / divisoes
  const mag = 10 ** Math.floor(Math.log10(bruto))
  const norm = bruto / mag
  return (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag
}

/** Ticks do eixo cobrindo [min, max] em passo bonito. Sempre ≥ 2 marcas. */
export function ticksDoEixo(min: number, max: number, divisoes = 4): readonly number[] {
  const span = max - min
  if (span <= 0) return [min]
  const passo = passoBonito(span, divisoes)
  const ticks: number[] = []
  for (let t = Math.ceil(min / passo) * passo; t <= max + passo * 0.01; t += passo) {
    ticks.push(Math.abs(t) < passo * 1e-9 ? 0 : t) // mata o -0 do acúmulo de ponto flutuante
  }
  return ticks
}
