/**
 * @file Matriz mês a mês de uma demonstração (estilo "Resumo Financeiro" contábil):
 * uma coluna por mês + Total, com AV% (vertical, sobre a receita do próprio mês) e
 * AH% (horizontal, variação vs mês anterior). Mesmo pipeline do lado — a coluna Total
 * é o cálculo do intervalo inteiro, não a soma das colunas (bate por construção).
 */
import { useMemo } from 'react'
import type { LinhaCalc } from '@/core/demonstracao'
import type { Intervalo } from '@/core/periodo'
import type { MesComparativo } from '@/lib/useComparativo'
import { brl } from '@/lib/money'

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const rotuloMes = (i: Intervalo) =>
  i.inicio ? `${MES_CURTO[Number(i.inicio.slice(5, 7)) - 1]}/${i.inicio.slice(2, 4)}` : '—'

const pctTexto = (parte: number, base: number) => (base > 0 ? `${((parte / base) * 100).toFixed(1)}%` : '—')
const ahTexto = (v: number, ant: number | null) =>
  ant === null || ant === 0 ? '—' : `${(((v - ant) / Math.abs(ant)) * 100) >= 0 ? '+' : ''}${(((v - ant) / Math.abs(ant)) * 100).toFixed(1)}%`

export function TabelaMeses({
  titulo,
  meses,
  total,
  tipo,
}: {
  titulo: string
  meses: readonly MesComparativo[]
  total: readonly LinhaCalc[]
  tipo: 'dre' | 'dfc'
}) {
  const colunas = useMemo(() => meses.map((m) => (tipo === 'dre' ? m.dre : m.dfc)), [meses, tipo])
  const bases = useMemo(
    () => colunas.map((c) => (tipo === 'dre' ? (c.find((l) => l.id === 'dre_receita')?.valorCentavos ?? 0) : 0)),
    [colunas, tipo],
  )
  const baseTotal = tipo === 'dre' ? (total.find((l) => l.id === 'dre_receita')?.valorCentavos ?? 0) : 0

  return (
    <div className="overflow-hidden rounded-card border border-bd bg-surface">
      <p className="border-b border-bd px-4 py-3 text-sm font-semibold">{titulo}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-bd text-left text-[10px] uppercase tracking-wider text-muted">
            <tr>
              <th className="sticky left-0 bg-surface px-4 py-2.5">Descrição</th>
              {meses.map((m, i) => (
                <th key={m.intervalo.inicio ?? i} className="whitespace-nowrap px-3 py-2.5 text-right">
                  {rotuloMes(m.intervalo)}
                  <span className="block font-normal normal-case text-muted/60">AV% · AH%</span>
                </th>
              ))}
              <th className="whitespace-nowrap border-l border-bd px-4 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {total.map((linha, li) => {
              const subtotal = linha.tipo === 'subtotal'
              return (
                <tr key={linha.id} className={subtotal ? 'bg-surface2/50 font-bold' : 'border-t border-bd/40'}>
                  <td className="sticky left-0 max-w-[220px] truncate bg-surface px-4 py-2" title={linha.nome}>
                    {linha.nome}
                  </td>
                  {colunas.map((col, ci) => {
                    const v = col[li]?.valorCentavos ?? 0
                    const ant = ci > 0 ? (colunas[ci - 1]?.[li]?.valorCentavos ?? 0) : null
                    return (
                      <td key={ci} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        <span className={v < 0 ? 'text-danger' : ''}>{brl(v)}</span>
                        <span className="block text-[10px] text-muted">
                          {pctTexto(Math.abs(v), bases[ci] ?? 0)} · {ahTexto(v, ant)}
                        </span>
                      </td>
                    )
                  })}
                  <td className="whitespace-nowrap border-l border-bd px-4 py-2 text-right tabular-nums">
                    <span className={`font-semibold ${linha.valorCentavos < 0 ? 'text-danger' : ''}`}>
                      {brl(linha.valorCentavos)}
                    </span>
                    <span className="block text-[10px] text-muted">{pctTexto(Math.abs(linha.valorCentavos), baseTotal)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-bd px-4 py-2 text-[11px] text-muted">
        AV% = participação sobre a Receita Bruta do próprio mês · AH% = variação sobre o mês anterior ·
        Total = cálculo do intervalo inteiro
      </p>
    </div>
  )
}
