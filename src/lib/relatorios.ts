/**
 * @file Cálculos dos relatórios derivados do editado + títulos crus da Omie.
 * Tudo a partir de dado real; o que não dá pra computar fica fora (sem inventar).
 */
import type { Movimento } from '@/core/movimento'
import { ordemGrupo, type Fatia } from './graficos'
import { pct } from './money'
import type { GrupoEspelho } from './resultado'

export interface LinhaValor {
  readonly label: string
  readonly valorCentavos: number
  readonly pctReceita: string
  readonly subgrupos: readonly { readonly label: string; readonly valorCentavos: number }[]
}

/** Grupos de receita (entrada, não neutros), na ordem do plano (numérica), com % da Receita Líquida. */
export function fontesReceita(grupos: readonly GrupoEspelho[], receitaLiq: number): LinhaValor[] {
  return grupos
    .filter((g) => !g.meta?.neutra && g.totalCentavos > 0)
    .slice()
    .sort((a, b) => ordemGrupo(a.nome) - ordemGrupo(b.nome))
    .map((g) => linha(g, g.totalCentavos, receitaLiq))
}

/** Grupos de custo/despesa (saída), na ordem do plano (numérica), com % da Receita Líquida. */
export function custosDetalhe(grupos: readonly GrupoEspelho[], receitaLiq: number): LinhaValor[] {
  return grupos
    .filter((g) => !g.meta?.neutra && g.totalCentavos < 0)
    .slice()
    .sort((a, b) => ordemGrupo(a.nome) - ordemGrupo(b.nome))
    .map((g) => linha(g, -g.totalCentavos, receitaLiq))
}

function linha(g: GrupoEspelho, magnitude: number, receitaLiq: number): LinhaValor {
  return {
    label: g.nome,
    valorCentavos: magnitude,
    pctReceita: pct(magnitude, receitaLiq),
    subgrupos: g.subgrupos
      .filter((s) => s.totalCentavos !== 0)
      .map((s) => ({ label: s.nome, valorCentavos: Math.abs(s.totalCentavos) }))
      .sort((a, b) => b.valorCentavos - a.valorCentavos),
  }
}

/** Receita por contraparte (cliente) — títulos de natureza R com contraparte, maior → menor. */
export function receitaPorCliente(movs: readonly Movimento[], max = 8): Fatia[] {
  const acc = new Map<string, number>()
  for (const m of movs) {
    if (m.natureza.toUpperCase() !== 'R' || !m.contraparte) continue
    acc.set(m.contraparte, (acc.get(m.contraparte) ?? 0) + m.valorCentavos)
  }
  return [...acc.entries()]
    .map(([label, valorCentavos]) => ({ label, valorCentavos }))
    .filter((f) => f.valorCentavos > 0)
    .sort((a, b) => b.valorCentavos - a.valorCentavos)
    .slice(0, max)
}

// --- Capital de giro: aging de títulos em aberto (cru da Omie) ---

export interface FaixaAging {
  readonly faixa: string
  readonly valorCentavos: number
  readonly qtd: number
}

const FAIXAS = ['A vencer', '0–30 vencido', '31–90 vencido', '> 90 vencido'] as const

function diasAtraso(vencimento: string, hoje: Date): number {
  const [d, m, a] = vencimento.split('/').map(Number)
  if (!d || !m || !a) return Number.NaN
  return Math.floor((hoje.getTime() - new Date(a, m - 1, d).getTime()) / 86_400_000)
}

function faixaDe(dias: number): (typeof FAIXAS)[number] {
  if (dias <= 0) return 'A vencer'
  if (dias <= 30) return '0–30 vencido'
  if (dias <= 90) return '31–90 vencido'
  return '> 90 vencido'
}

/** Aging dos títulos em aberto de uma natureza (R = receber, P = pagar). */
export function aging(movs: readonly Movimento[], natureza: 'R' | 'P', hoje: Date): FaixaAging[] {
  const acc = new Map<string, { v: number; q: number }>(FAIXAS.map((f) => [f, { v: 0, q: 0 }]))
  for (const m of movs) {
    if (m.natureza.toUpperCase() !== natureza || m.valorAbertoCentavos <= 0) continue
    const dias = diasAtraso(m.dataVencimento, hoje)
    if (Number.isNaN(dias)) continue
    const a = acc.get(faixaDe(dias))!
    a.v += m.valorAbertoCentavos
    a.q += 1
  }
  return FAIXAS.map((f) => ({ faixa: f, valorCentavos: acc.get(f)!.v, qtd: acc.get(f)!.q }))
}

export function totalAberto(movs: readonly Movimento[], natureza: 'R' | 'P'): number {
  return movs
    .filter((m) => m.natureza.toUpperCase() === natureza && m.valorAbertoCentavos > 0)
    .reduce((s, m) => s + m.valorAbertoCentavos, 0)
}

// --- Prazos médios (Espec §7: PMR/PMP) — possíveis agora que o período dá o denominador ---

export interface PrazosMedios {
  /** PMR = (recebíveis em aberto ÷ receita do período) × dias. null = sem receita. */
  readonly pmr: number | null
  /** PMP = (pagáveis em aberto ÷ compras do período) × dias. null = sem compras. */
  readonly pmp: number | null
  /** Ciclo financeiro SEM estoque (PME exigiria estoque): PMR − PMP. */
  readonly ciclo: number | null
  readonly dias: number
}

export function prazosMedios(p: {
  recebiveis: number
  pagaveis: number
  receita: number
  compras: number
  dias: number
}): PrazosMedios {
  const pmr = p.receita > 0 ? Math.round((p.recebiveis / p.receita) * p.dias) : null
  const pmp = p.compras > 0 ? Math.round((p.pagaveis / p.compras) * p.dias) : null
  return { pmr, pmp, ciclo: pmr !== null && pmp !== null ? pmr - pmp : null, dias: p.dias }
}
