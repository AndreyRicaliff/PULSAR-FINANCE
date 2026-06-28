/** @file Tabela genérica grupo/subgrupo com % da receita. */
import { brl } from '@/lib/money'
import type { LinhaValor } from '@/lib/relatorios'

export function TabelaValor({ titulo, linhas, totalRotulo }: { titulo: string; linhas: readonly LinhaValor[]; totalRotulo: string }) {
  const total = linhas.reduce((s, l) => s + l.valorCentavos, 0)
  return (
    <div className="overflow-hidden rounded-card border border-bd bg-surface">
      <h2 className="border-b border-bd px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</h2>
      <table className="w-full text-sm">
        <tbody>
          {linhas.map((l) => (
            <Grupo key={l.label} l={l} />
          ))}
          <tr className="border-t border-bd bg-surface2/50 font-bold">
            <td className="px-4 py-2.5">{totalRotulo}</td>
            <td className="px-4 py-2.5 text-right text-xs text-muted" />
            <td className="px-4 py-2.5 text-right tabular-nums">{brl(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Grupo({ l }: { l: LinhaValor }) {
  return (
    <>
      <tr className="border-b border-bd/40">
        <td className="px-4 py-2.5 font-medium">{l.label}</td>
        <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted">{l.pctReceita}</td>
        <td className="px-4 py-2.5 text-right tabular-nums">{brl(l.valorCentavos)}</td>
      </tr>
      {l.subgrupos.map((s) => (
        <tr key={s.label} className="border-b border-bd/30 text-muted">
          <td className="py-1.5 pl-8 pr-4 text-xs">↳ {s.label}</td>
          <td />
          <td className="px-4 py-1.5 text-right text-xs tabular-nums">{brl(s.valorCentavos)}</td>
        </tr>
      ))}
    </>
  )
}
