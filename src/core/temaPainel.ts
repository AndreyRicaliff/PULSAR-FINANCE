/**
 * @file Leva o tema da empresa (ficha) para o PAINEL do cliente, não só para as apresentações.
 *
 * Pinta os ACENTOS, nunca as superfícies. As superfícies carregam o contraste que foi medido
 * e corrigido em 06/08 (subgrupo estava em 3,94, reprovando AA); trocá-las por uma cor
 * arbitrária de cliente devolveria o problema pela porta dos fundos.
 *
 * E o acento também não entra cru: `--c-secondary` é usado como TEXTO, e um acento escuro
 * — Vinho #B4304A, Safira #2F6FDE — sobre superfície escura fica ilegível. Aqui ele é
 * clareado até passar no mínimo AA. Tema bonito que não se lê é tema quebrado.
 */
import type { TemaApresentacao } from './temaApresentacao'

export type Canais = readonly [number, number, number]

/** '#7048E8' → [112, 72, 232]. Aceita forma curta ('#abc'); inválido devolve null. */
export function hexParaCanais(hex: string): Canais | null {
  const h = hex.trim().replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}

const canalLinear = (c: number): number => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminancia([r, g, b]: Canais): number {
  return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b)
}

/** Razão de contraste WCAG entre duas cores (1 = idênticas, 21 = preto/branco). */
export function contraste(a: Canais, b: Canais): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro! + 0.05) / (escuro! + 0.05)
}

const misturar = (a: Canais, b: Canais, t: number): Canais => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]

/**
 * Aproxima `cor` de `direcao` até alcançar `alvo` de contraste contra `fundo`. Preserva o
 * matiz da marca (mistura, não substitui) e para no primeiro passo suficiente — clarear
 * além do necessário apagaria a identidade do cliente.
 */
export function ajustarParaContraste(cor: Canais, fundo: Canais, alvo: number, direcao: Canais): Canais {
  if (contraste(cor, fundo) >= alvo) return cor
  for (let passo = 1; passo <= 20; passo++) {
    const tentativa = misturar(cor, direcao, passo / 20)
    if (contraste(tentativa, fundo) >= alvo) return tentativa
  }
  return direcao
}

const BRANCO: Canais = [255, 255, 255]
const PRETO: Canais = [0, 0, 0]
/** Mínimo AA para texto normal. Abaixo disto o rótulo colorido some do painel. */
const ALVO_TEXTO = 4.5

const emCanais = (c: Canais): string => `${c[0]} ${c[1]} ${c[2]}`

/**
 * Vars a aplicar no container do painel do cliente. `fundo` é o surface efetivo do tema
 * ativo — o ajuste de legibilidade depende dele, então quem chama informa.
 */
export function varsDoPainel(tema: TemaApresentacao, fundo: Canais): Record<string, string> {
  const acento = hexParaCanais(tema.acento)
  if (!acento) return {}
  // Fundo escuro puxa o acento para o branco; fundo claro, para o preto.
  const direcao = luminancia(fundo) < 0.5 ? BRANCO : PRETO
  return {
    '--c-primary': emCanais(acento),
    '--c-secondary': emCanais(ajustarParaContraste(acento, fundo, ALVO_TEXTO, direcao)),
  }
}
