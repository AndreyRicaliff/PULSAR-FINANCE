/**
 * @file Projeção de caixa por TÍTULOS (contas a pagar/receber) — núcleo puro.
 * Previsto = títulos em aberto pelo mês de vencimento (compromisso contratado).
 * Realizado = movimentos pagos pelo mês do pagamento (regime caixa).
 * Conciliação: título e movimento são atribuídos ao grupo pela MESMA matriz
 * (dimensão contas, conc.mapa[categoria]) — sem grupo, caem em "a conciliar".
 */
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import { isoDeMov } from './periodo'
import { estaAberto, type Titulo } from './titulo'

export const A_CONCILIAR = 'a_conciliar'

/** Grupo do título pela matriz de classificações (null = a conciliar). */
export function grupoDoTitulo(t: Titulo, conc: Conciliacao): string | null {
  return conc.mapa[t.categoria] ?? null
}

export interface LadoMes {
  readonly entrada: number
  readonly saida: number
}

export interface MesProjecao {
  readonly mes: string // 'aaaa-mm'
  readonly rotulo: string // 'mm/aa'
  readonly previsto: LadoMes
  readonly realizado: LadoMes
}

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`

interface LadoMut {
  entrada: number
  saida: number
}

/** Série mensal previsto (títulos abertos por vencimento) × realizado (pagamentos). */
export function projecaoMensal(titulos: readonly Titulo[], movimentos: readonly Movimento[]): MesProjecao[] {
  const porMes = new Map<string, { previsto: LadoMut; realizado: LadoMut }>()
  const mesDe = (chave: string) => {
    const m = porMes.get(chave) ?? { previsto: { entrada: 0, saida: 0 }, realizado: { entrada: 0, saida: 0 } }
    porMes.set(chave, m)
    return m
  }
  for (const t of titulos) {
    if (!estaAberto(t)) continue
    const iso = isoDeMov(t.dataVencimento || t.dataPrevisao)
    if (!iso) continue
    mesDe(iso.slice(0, 7)).previsto[t.natureza === 'R' ? 'entrada' : 'saida'] += t.valorCentavos
  }
  for (const m of movimentos) {
    if ((m.valorPagoCentavos ?? 0) <= 0) continue
    const iso = isoDeMov(m.dataPagamento ?? '')
    if (!iso) continue
    mesDe(iso.slice(0, 7)).realizado[m.natureza.toUpperCase() === 'R' ? 'entrada' : 'saida'] += m.valorPagoCentavos
  }
  return [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, rotulo: rotuloMes(mes), ...v }))
}

export interface GrupoProjecao {
  /** Id do grupo na estrutura de contas, ou A_CONCILIAR. */
  readonly grupoId: string
  readonly entrada: number
  readonly saida: number
  readonly qtd: number
}

/** Em aberto por grupo conciliado — o bucket "a conciliar" fica explícito, nunca some. */
export function abertoPorGrupo(titulos: readonly Titulo[], conc: Conciliacao): GrupoProjecao[] {
  const acc = new Map<string, { entrada: number; saida: number; qtd: number }>()
  for (const t of titulos) {
    if (!estaAberto(t)) continue
    const id = grupoDoTitulo(t, conc) ?? A_CONCILIAR
    const a = acc.get(id) ?? { entrada: 0, saida: 0, qtd: 0 }
    a[t.natureza === 'R' ? 'entrada' : 'saida'] += t.valorCentavos
    a.qtd += 1
    acc.set(id, a)
  }
  return [...acc.entries()]
    .map(([grupoId, v]) => ({ grupoId, ...v }))
    .sort((a, b) => Math.abs(b.entrada - b.saida) - Math.abs(a.entrada - a.saida))
}

export interface CategoriaProjecao {
  readonly categoria: string
  readonly previsto: number
  readonly realizado: number
  readonly qtdAbertos: number
}

/** Quebra de um grupo em CATEGORIAS: previsto (títulos abertos) × realizado (pagamentos). */
export function categoriasDoGrupo(
  titulos: readonly Titulo[],
  movimentos: readonly Movimento[],
  conc: Conciliacao,
  grupoId: string,
): CategoriaProjecao[] {
  const acc = new Map<string, { previsto: number; realizado: number; qtdAbertos: number }>()
  const pega = (cat: string) => {
    const a = acc.get(cat) ?? { previsto: 0, realizado: 0, qtdAbertos: 0 }
    acc.set(cat, a)
    return a
  }
  const doGrupo = (cat: string) => (grupoId === A_CONCILIAR ? !conc.mapa[cat] : conc.mapa[cat] === grupoId)
  for (const t of titulos) {
    if (!estaAberto(t) || !doGrupo(t.categoria)) continue
    const a = pega(t.categoria)
    a.previsto += t.valorCentavos
    a.qtdAbertos += 1
  }
  for (const m of movimentos) {
    if ((m.valorPagoCentavos ?? 0) <= 0 || !doGrupo(m.categoria)) continue
    pega(m.categoria).realizado += m.valorPagoCentavos
  }
  return [...acc.entries()]
    .map(([categoria, v]) => ({ categoria, ...v }))
    .sort((a, b) => b.previsto + b.realizado - (a.previsto + a.realizado))
}
