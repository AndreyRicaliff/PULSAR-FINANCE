/** @file Painel "Grupos a alocar": grupos não alocados com drill e seletor de linha. */
import { useState } from 'react'
import { brl } from '@/lib/money'
import type { LinhaCalc } from '@/core/demonstracao'
import { Grip, NomeExpansivel } from './atomos.tsx'
import { Arvore } from './Arvore.tsx'
import type { AcoesArvore, GrupoAlocavel } from './tipos.ts'

export function AAlocar({
  grupos,
  entradas,
  acoes,
  onAlocar,
}: {
  grupos: readonly GrupoAlocavel[]
  entradas: readonly LinhaCalc[]
  acoes: AcoesArvore
  onAlocar: (grupoId: string, linhaId: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-dashed border-bd p-1 lg:sticky lg:top-6">
      <h2 className="px-3 pt-2 text-sm font-semibold uppercase tracking-wide text-muted">
        Grupos a alocar ({grupos.length})
      </h2>
      <div className="overflow-hidden rounded-card border border-bd bg-surface">
        <table className="w-full text-sm">
          <tbody>
            {grupos.map((g) => (
              <GrupoLinha key={g.id} g={g} entradas={entradas} acoes={acoes} onAlocar={onAlocar} />
            ))}
            {grupos.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted">Todos os grupos alocados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GrupoLinha({
  g,
  entradas,
  acoes,
  onAlocar,
}: {
  g: GrupoAlocavel
  entradas: readonly LinhaCalc[]
  acoes: AcoesArvore
  onAlocar: (grupoId: string, linhaId: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const arvore = g.arvore ?? []
  // Neutro é realocável (livre-arbítrio): só ganha um aviso discreto de Regra Mãe.
  return (
    <>
      <tr className="border-b border-bd/60 hover:bg-surface2/40">
        <td className="px-3 py-2">
          <span className="flex items-center gap-1.5">
            <Grip chave={g.id} />
            <NomeExpansivel
              nome={g.nome}
              aberto={aberto}
              temDrill={arvore.length > 0}
              onAlternar={() => setAberto((v) => !v)}
              tag={
                g.neutra ? (
                  <span className="shrink-0 rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-medium text-warn" title="Movimento neutro (Regra Mãe): por padrão fica a conciliar, mas você pode realocar">
                    Regra Mãe
                  </span>
                ) : undefined
              }
            />
          </span>
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-muted">{brl(g.totalCentavos)}</td>
        <td className="px-3 py-2">
          <select
            value=""
            onChange={(e) => e.target.value && onAlocar(g.id, e.target.value)}
            className="rounded border border-bd bg-surface2 px-2 py-1 text-xs outline-none focus:border-primary"
          >
            <option value="">alocar em…</option>
            {entradas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </td>
      </tr>
      {aberto ? (
        <tr className="border-b border-bd/60 bg-surface2/30">
          <td colSpan={3}>
            <Arvore subgrupos={arvore} acoes={acoes} />
          </td>
        </tr>
      ) : null}
    </>
  )
}
