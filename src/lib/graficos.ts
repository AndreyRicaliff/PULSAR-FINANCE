/**
 * @file Prepara dados para os gráficos — projeção do MODELO AG conciliado (o editado).
 * Exclui neutros (Regra Mãe) e não conciliados. Sinal pela natureza crua da Omie.
 */
import type { Conciliacao } from '@/core/modelo'
import type { Movimento } from '@/core/movimento'
import type { GrupoEspelho } from './resultado'

export interface Fatia {
  readonly label: string
  readonly valorCentavos: number
}

export interface BarraMes {
  readonly mes: string
  readonly entrada: number
  readonly saida: number
}

/** Ordem canônica do grupo pelo prefixo numérico do nome ("3. Custos..." → 3). */
export function ordemGrupo(nome: string): number {
  const m = nome.match(/^\s*(\d+)/)
  return m ? Number(m[1]) : 999
}

/** Grupos de saída (despesas/custos), na ordem do plano (numérica). */
export function composicaoDespesas(grupos: readonly GrupoEspelho[]): Fatia[] {
  return grupos
    .filter((g) => !g.meta?.neutra && g.totalCentavos < 0)
    .slice()
    .sort((a, b) => ordemGrupo(a.nome) - ordemGrupo(b.nome))
    .map((g) => ({ label: g.nome, valorCentavos: -g.totalCentavos }))
}

/** Todos os grupos operacionais por magnitude (receita + saídas), para barras. */
export function gruposPorValor(grupos: readonly GrupoEspelho[]): Fatia[] {
  return grupos
    .filter((g) => !g.meta?.neutra && g.totalCentavos !== 0)
    .map((g) => ({ label: g.nome, valorCentavos: Math.abs(g.totalCentavos) }))
    .sort((a, b) => b.valorCentavos - a.valorCentavos)
}

export function movimentacaoMensal(movs: readonly Movimento[], conc: Conciliacao): BarraMes[] {
  const idx = new Map(conc.estrutura.map((n) => [n.id, n]))
  const acc = new Map<string, { e: number; s: number }>()
  for (const m of movs) {
    const no = idx.get(conc.mapa[m.categoria] ?? '')
    if (!no || no.meta?.neutra) continue
    const chave = chaveMes(m.data)
    if (!chave) continue
    const a = acc.get(chave) ?? { e: 0, s: 0 }
    if (m.natureza.toUpperCase() === 'R') a.e += Math.abs(m.valorCentavos)
    else a.s += Math.abs(m.valorCentavos)
    acc.set(chave, a)
  }
  return [...acc.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, v]) => ({ mes: rotuloMes(chave), entrada: v.e, saida: v.s }))
}

function chaveMes(data: string): string {
  const p = data.split('/')
  return p.length === 3 ? `${p[2]}-${p[1]}` : ''
}

function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split('-')
  return `${mes}/${(ano ?? '').slice(2)}`
}
