/**
 * @file Indicador de CAPEX — soma dos nós MARCADOS (meta.capex) na base de CAIXA
 * (valor efetivamente pago, mês pela data de pagamento): mesma base auditável da DFC,
 * e a mesma do orçamento de baixas (adesão compara igual com igual).
 * Natureza R subtrai (estorno/devolução reduz o desembolso). A marcação vive na
 * estrutura POR EMPRESA (Matriz) — configuração única por tenant, sem tabela nova.
 */
import type { Conciliacao, MetaContabil, No, TipoCapex } from './modelo'
import { movimentosCaixa, type Movimento } from './movimento'
import { dataDoMovimento } from './periodo'

export interface CapexMes {
  readonly mes: string // 'aaaa-mm'
  readonly investimentoCentavos: number
  readonly manutencaoCentavos: number
}

export interface CapexNo {
  readonly nome: string
  readonly tipo: TipoCapex
  readonly valorCentavos: number
}

export interface ResumoCapex {
  readonly investimentoCentavos: number
  readonly manutencaoCentavos: number
  readonly porMes: readonly CapexMes[]
  readonly porNo: readonly CapexNo[]
  /** true quando existe ao menos um nó marcado na estrutura (mesmo sem movimento). */
  readonly temNoMarcado: boolean
}

/** capex efetivo do nó: meta própria SUBSTITUI a da raiz (mesma regra de demonstracoesDoNo).
 * `null` (opt-out explícito) normaliza para undefined — fora do indicador. */
export function capexDoNo(no: No, raiz: No | undefined): TipoCapex | undefined {
  const efetiva: MetaContabil | undefined = no.meta ?? raiz?.meta
  return efetiva?.capex ?? undefined
}

export function resumoCapex(movs: readonly Movimento[], conc: Conciliacao): ResumoCapex {
  const noPorId = new Map(conc.estrutura.map((n) => [n.id, n]))
  const temNoMarcado = conc.estrutura.some((n) => capexDoNo(n, n.paiId ? noPorId.get(n.paiId) : undefined) !== undefined)
  const meses = new Map<string, { inv: number; man: number }>()
  const nos = new Map<string, { nome: string; tipo: TipoCapex; valor: number }>()
  let inv = 0
  let man = 0

  for (const m of movimentosCaixa(movs)) {
    const no = noPorId.get(conc.mapa[m.categoria] ?? '')
    if (!no) continue
    const tipo = capexDoNo(no, no.paiId ? noPorId.get(no.paiId) : undefined)
    if (!tipo) continue
    const valor = m.natureza.toUpperCase() === 'R' ? -Math.abs(m.valorCentavos) : Math.abs(m.valorCentavos)
    if (tipo === 'investimento') inv += valor
    else man += valor

    const mes = (dataDoMovimento(m, 'caixa') ?? '').slice(0, 7)
    if (mes) {
      const a = meses.get(mes) ?? { inv: 0, man: 0 }
      if (tipo === 'investimento') a.inv += valor
      else a.man += valor
      meses.set(mes, a)
    }

    const acNo = nos.get(no.id) ?? { nome: no.nome, tipo, valor: 0 }
    acNo.valor += valor
    nos.set(no.id, acNo)
  }

  return {
    investimentoCentavos: inv,
    manutencaoCentavos: man,
    porMes: [...meses.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({ mes, investimentoCentavos: v.inv, manutencaoCentavos: v.man })),
    porNo: [...nos.values()]
      .filter((n) => n.valor !== 0)
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
      .map((n) => ({ nome: n.nome, tipo: n.tipo, valorCentavos: n.valor })),
    temNoMarcado,
  }
}
