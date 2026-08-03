/**
 * @file Seção "Possíveis duplicatas" — grupos de códigos distintos com o mesmo nome
 * normalizado. Detecção sugere; o OPERADOR decide: unificar o nome (quando oferecido),
 * marcar como legítimo ou recolocar na Matriz. Nome limpo + etiqueta de estado mantêm
 * o excluído sempre distinto do vivo.
 */
import type { GrupoDuplicado } from '@/core/duplicatas'
import { brl } from '@/lib/money'
import { EtiquetaEstado } from './EtiquetaEstado.tsx'

interface Props {
  readonly grupos: readonly GrupoDuplicado[]
  /** Oferecido só onde a fusão de nome faz sentido (contrapartes — categorias não fundem). */
  readonly onUnificar?: (g: GrupoDuplicado) => void
  readonly onIgnorar: (g: GrupoDuplicado) => void
  readonly onRecolocar: (g: GrupoDuplicado) => void
  readonly mostrarValores?: boolean
}

export function SecaoDuplicatas({ grupos, onUnificar, onIgnorar, onRecolocar, mostrarValores = true }: Props) {
  if (grupos.length === 0) return null
  return (
    <section className="flex flex-col gap-3 rounded-card border border-warn/40 bg-warn/5 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-warn">
        Possíveis duplicatas · {grupos.length} grupo{grupos.length > 1 ? 's' : ''}
      </h3>
      <ul className="flex flex-col gap-2.5">
        {grupos.map((g) => (
          <li key={g.chave} className="flex flex-col gap-2 rounded-lg border border-bd bg-surface px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {g.membros.map((m) => (
                <span key={m.codigo} className="inline-flex items-center gap-1.5 text-sm">
                  <span>{m.nome}</span>
                  {m.estado ? <EtiquetaEstado estado={m.estado} /> : null}
                  <span className="font-mono text-[10px] text-muted/70" title={`Código no ERP: ${m.codigo}`}>
                    {m.codigo.length > 12 ? `${m.codigo.slice(0, 12)}…` : m.codigo}
                  </span>
                  {mostrarValores && (m.totalCentavos !== 0 || m.qtd > 0) ? (
                    <span className="tabular-nums text-xs text-muted">
                      {brl(m.totalCentavos)} · {m.qtd} mov.
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {onUnificar ? (
                <button
                  type="button"
                  onClick={() => onUnificar(g)}
                  className="fx-press rounded-lg border border-bd px-2.5 py-1 font-medium text-text transition-colors hover:border-primary"
                >
                  Unificar nome
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onRecolocar(g)}
                title="Abre a Matriz de Classificações com a busca preenchida para conciliar/realocar"
                className="fx-press rounded-lg border border-bd px-2.5 py-1 text-muted transition-colors hover:border-primary hover:text-text"
              >
                Recolocar na Matriz
              </button>
              <button
                type="button"
                onClick={() => onIgnorar(g)}
                className="fx-press rounded-lg border border-bd px-2.5 py-1 text-muted transition-colors hover:border-primary hover:text-text"
              >
                Não é duplicata
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
