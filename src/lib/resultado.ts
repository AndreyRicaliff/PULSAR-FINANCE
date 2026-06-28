/**
 * @file Módulo 5 — espelha o MODELO AG conciliado (o editado) e mede cobertura.
 * A DRE/DFC propriamente ditas são derivadas da estrutura EDITÁVEL (core/demonstracao),
 * não daqui. Valores 100% crus da Omie; sinal pela natureza (R = entrada, P = saída);
 * não-conciliados e neutros (Regra Mãe) ficam de fora.
 */
import type { Conciliacao, MetaContabil, No } from '@/core/modelo'
import type { Movimento } from '@/core/movimento'

export interface LinhaResultado {
  readonly rotulo: string
  readonly valorCentavos: number
  readonly subtotal: boolean
}

export interface Cobertura {
  readonly conciliadoCentavos: number
  readonly pendenteCentavos: number
  readonly pendenteQtd: number
  readonly pct: number
}

/** Sinal pela natureza crua da Omie: R (receber) = entrada (+), P (pagar) = saída (–). */
function comSinal(m: Movimento): number {
  return m.natureza.toUpperCase() === 'R' ? m.valorCentavos : -m.valorCentavos
}

export function cobertura(movs: readonly Movimento[], conc: Conciliacao): Cobertura {
  let conciliado = 0
  let pendente = 0
  let pendenteQtd = 0
  for (const m of movs) {
    const mag = Math.abs(m.valorCentavos)
    if (conc.mapa[m.categoria]) {
      conciliado += mag
    } else {
      pendente += mag
      pendenteQtd += 1
    }
  }
  const total = conciliado + pendente
  return { conciliadoCentavos: conciliado, pendenteCentavos: pendente, pendenteQtd, pct: total ? Math.round((conciliado / total) * 100) : 0 }
}

// --- Espelho da estrutura AG (balancete do editado) ---

export interface NoEspelho {
  readonly id: string
  readonly nome: string
  readonly totalCentavos: number
  readonly qtd: number
}

export interface GrupoEspelho extends NoEspelho {
  readonly meta?: MetaContabil
  readonly subgrupos: readonly NoEspelho[]
}

interface Acum {
  total: number
  qtd: number
}

function acumularPorNo(movs: readonly Movimento[], conc: Conciliacao): Map<string, Acum> {
  const porNo = new Map<string, Acum>()
  for (const m of movs) {
    const noId = conc.mapa[m.categoria]
    if (!noId) continue
    const a = porNo.get(noId) ?? { total: 0, qtd: 0 }
    a.total += comSinal(m)
    a.qtd += 1
    porNo.set(noId, a)
  }
  return porNo
}

function noEspelho(no: No, porNo: ReadonlyMap<string, Acum>): NoEspelho {
  const a = porNo.get(no.id) ?? { total: 0, qtd: 0 }
  return { id: no.id, nome: no.nome, totalCentavos: a.total, qtd: a.qtd }
}

/** Reflete a estrutura AG conciliada (grupo → subgrupo) com totais. Só nós com movimentos. */
export function espelhoEstrutura(movs: readonly Movimento[], conc: Conciliacao): GrupoEspelho[] {
  const porNo = acumularPorNo(movs, conc)
  return conc.estrutura
    .filter((n) => !n.paiId)
    .map((raiz) => montarGrupoEspelho(raiz, conc.estrutura, porNo))
    .filter((g) => g.qtd > 0)
}

function montarGrupoEspelho(raiz: No, estrutura: readonly No[], porNo: ReadonlyMap<string, Acum>): GrupoEspelho {
  const subgrupos = estrutura
    .filter((n) => n.paiId === raiz.id)
    .map((s) => noEspelho(s, porNo))
    .filter((s) => s.qtd > 0)
  const direto = porNo.get(raiz.id) ?? { total: 0, qtd: 0 }
  const totalSubs = subgrupos.reduce((a, s) => a + s.totalCentavos, 0)
  const qtdSubs = subgrupos.reduce((a, s) => a + s.qtd, 0)
  return {
    id: raiz.id,
    nome: raiz.nome,
    meta: raiz.meta,
    totalCentavos: direto.total + totalSubs,
    qtd: direto.qtd + qtdSubs,
    subgrupos,
  }
}
