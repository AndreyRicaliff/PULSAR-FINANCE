/** Centavos (inteiro) → string BRL. */
export function brl(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Fração de variação (0.12) → '+12,0%' / '−4,1%' com sinal. '—' quando null. */
export function pctVariacao(frac: number | null): string {
  if (frac === null) return '—'
  const v = Math.abs(frac * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${frac >= 0 ? '+' : '−'}${v}%`
}

/** Variação fracionária atual vs anterior (0.12 = +12%) — null sem base (anterior 0). */
export function fracVariacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return (atual - anterior) / Math.abs(anterior)
}

/** Razão n/base → percentual pt-BR com 1 casa (vírgula decimal). '—' quando base é 0. */
export function pct(n: number, base: number): string {
  if (!base) return '—'
  const v = ((n / base) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${v}%`
}
