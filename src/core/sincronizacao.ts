/**
 * @file Merge de sincronização Omie. Atualiza SÓ campos de valor de títulos já conhecidos
 * (não mexe em categoria/contraparte → não altera classificação); título novo entra inteiro
 * e, como sua categoria pode não estar mapeada, cai naturalmente em "a conciliar".
 * Import relativo (sem alias @) para rodar também no Deno da Edge Function.
 */
import type { Movimento } from './movimento.ts'

export interface ResultadoSync {
  readonly movimentos: readonly Movimento[]
  readonly novos: number
  readonly atualizados: number
  readonly inalterados: number
}

function mudouValor(a: Movimento, b: Movimento): boolean {
  return (
    a.valorCentavos !== b.valorCentavos ||
    a.valorPagoCentavos !== b.valorPagoCentavos ||
    a.valorAbertoCentavos !== b.valorAbertoCentavos ||
    a.jurosCentavos !== b.jurosCentavos ||
    a.multaCentavos !== b.multaCentavos ||
    a.descontoCentavos !== b.descontoCentavos ||
    a.status !== b.status ||
    a.liquidado !== b.liquidado
  )
}

/** Sobrescreve só os campos de valor, preservando categoria/contraparte/estrutura. */
function comValoresAtualizados(atual: Movimento, novo: Movimento): Movimento {
  return {
    ...atual,
    valorCentavos: novo.valorCentavos,
    valorPagoCentavos: novo.valorPagoCentavos,
    valorAbertoCentavos: novo.valorAbertoCentavos,
    jurosCentavos: novo.jurosCentavos,
    multaCentavos: novo.multaCentavos,
    descontoCentavos: novo.descontoCentavos,
    status: novo.status,
    liquidado: novo.liquidado,
    data: novo.data,
    dataVencimento: novo.dataVencimento,
  }
}

export function mesclarMovimentos(
  atuais: readonly Movimento[],
  recebidos: readonly Movimento[],
): ResultadoSync {
  const porId = new Map(atuais.map((m) => [m.idTitulo, m]))
  let novos = 0
  let atualizados = 0
  for (const novo of recebidos) {
    const atual = porId.get(novo.idTitulo)
    if (!atual) {
      porId.set(novo.idTitulo, novo)
      novos += 1
      continue
    }
    if (mudouValor(atual, novo)) {
      porId.set(novo.idTitulo, comValoresAtualizados(atual, novo))
      atualizados += 1
    }
  }
  return {
    movimentos: [...porId.values()],
    novos,
    atualizados,
    inalterados: atuais.length - atualizados,
  }
}
