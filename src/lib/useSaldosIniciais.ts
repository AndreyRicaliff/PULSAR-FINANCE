/**
 * @file Saldos iniciais de caixa por cliente, GUARDADOS POR MÊS ('YYYY-MM' → centavos).
 * Entrada manual (a Omie não sincroniza saldo bancário). Relatórios que precisam de saldo
 * inicial (ex.: Projeção/Fluxo) pegam o do mês de referência.
 */
import { useCallback } from 'react'
import { useEstadoSincronizado } from './persistencia'
import { useChaveCliente } from './clientes'

const BASE_CHAVE = 'painel-ag-saldos-iniciais-v2'

type Saldos = Readonly<Record<string, number>>

function normalizar(bruto: unknown): Saldos {
  return bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? (bruto as Saldos) : {}
}

export interface SaldosIniciaisApi {
  readonly saldos: Saldos
  /** Saldo (centavos) salvo para o mês 'YYYY-MM' — 0 se não houver. */
  readonly saldoDoMes: (mes: string) => number
  readonly definir: (mes: string, centavos: number) => void
  readonly remover: (mes: string) => void
}

export function useSaldosIniciais(): SaldosIniciaisApi {
  const chave = useChaveCliente(BASE_CHAVE)
  const [saldos, setSaldos] = useEstadoSincronizado<Saldos>(chave, normalizar)

  const definir = useCallback((mes: string, centavos: number) => setSaldos((s) => ({ ...s, [mes]: centavos })), [setSaldos])
  const remover = useCallback(
    (mes: string) =>
      setSaldos((s) => {
        const { [mes]: _, ...resto } = s
        return resto
      }),
    [setSaldos],
  )
  const saldoDoMes = useCallback((mes: string) => saldos[mes] ?? 0, [saldos])

  return { saldos, saldoDoMes, definir, remover }
}
