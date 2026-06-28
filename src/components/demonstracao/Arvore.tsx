/** @file Drill subgrupo → classe (agrupadora Omie). Com `acoes`, permite override por subgrupo/classe. */
import { brl } from '@/lib/money'
import type { SubgrupoArvore } from '@/core/classes'
import { Grip, Lupa, SeletorLinha } from './atomos.tsx'
import type { AcoesArvore } from './tipos.ts'

export function Arvore({ subgrupos, acoes }: { subgrupos: readonly SubgrupoArvore[]; acoes?: AcoesArvore }) {
  if (!subgrupos.length) {
    return <p className="px-3 py-1.5 text-[11px] text-muted/70">Sem movimento no período.</p>
  }
  return (
    <div className="flex flex-col gap-1 py-1">
      {subgrupos.map((s) => (
        <div key={s.id} className="flex flex-col">
          <div className="flex items-center justify-between gap-2 px-3 py-0.5 text-[11px] font-medium text-secondary">
            <span className="flex min-w-0 items-center gap-1.5">
              {acoes ? <Grip chave={`sub:${s.id}`} /> : null}
              <span className="truncate">↳ {s.nome}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="tabular-nums">{brl(s.totalCentavos)}</span>
              {acoes ? (
                <SeletorLinha valor={acoes.mapaSub[s.id] ?? ''} entradas={acoes.entradas} onTrocar={(v) => acoes.onAlocarSub(s.id, v)} />
              ) : null}
            </span>
          </div>
          {s.classes.map((c) => (
            <div key={c.codigo} className="flex items-center justify-between gap-2 py-0.5 pl-7 pr-3 text-[11px] text-muted">
              <span className="flex min-w-0 items-center gap-1.5">
                {acoes ? <Grip chave={`cls:${c.codigo}`} /> : null}
                <span className="truncate">· {c.nome}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums">{brl(c.totalCentavos)}</span>
                {acoes ? (
                  <>
                    <Lupa onClick={() => acoes.onDetalheClasse(c.codigo, c.nome, s.id)} titulo="Ver movimentos da classe" />
                    <SeletorLinha valor={acoes.mapaClasse[c.codigo] ?? ''} entradas={acoes.entradas} onTrocar={(v) => acoes.onAlocarClasse(c.codigo, v)} />
                  </>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
