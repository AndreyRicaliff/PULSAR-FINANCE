/**
 * @file Painel "Novidades" (§7): o usuário percebe que o produto evolui.
 *
 * Seen-state em `localStorage` por navegador. O §7 sugere `profiles.changelog_seen_at` no
 * banco quando houver perfil; aqui isso custaria uma coluna e uma escrita a cada abertura
 * para um estado que é puramente de conveniência — se o usuário trocar de máquina, ver o
 * dot de novo é inofensivo. Migra para o banco junto com a Fase 3 do multi-acesso.
 */
import { useCallback, useEffect, useState } from 'react'
import { CHANGELOG, ROTULO_TAG, ULTIMA_ATUALIZACAO, type EntradaChangelog } from '@/core/changelog'
import { somSelecao } from '@/lib/som'

const CHAVE_VISTO = 'pulsar-changelog-seen'

export function useNovidades() {
  const [visto, setVisto] = useState(() => localStorage.getItem(CHAVE_VISTO) ?? '')
  const marcarVisto = useCallback(() => {
    localStorage.setItem(CHAVE_VISTO, ULTIMA_ATUALIZACAO)
    setVisto(ULTIMA_ATUALIZACAO)
  }, [])
  return { temNaoLido: visto < ULTIMA_ATUALIZACAO, marcarVisto }
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** 'aaaa-mm' → 'julho de 2026'. Agrupa o painel por mês, como manda o §7. */
function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MESES[Number(m) - 1] ?? m} de ${ano}`
}

function agrupar(entradas: readonly EntradaChangelog[]): [string, EntradaChangelog[]][] {
  const porMes = new Map<string, EntradaChangelog[]>()
  for (const e of entradas) {
    const mes = e.data.slice(0, 7)
    porMes.set(mes, [...(porMes.get(mes) ?? []), e])
  }
  return [...porMes.entries()].sort(([a], [b]) => b.localeCompare(a))
}

export function PainelNovidades({ onFechar }: { onFechar: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-label="Novidades do Pulsar Finance">
      <button
        type="button"
        aria-label="Fechar novidades"
        onClick={onFechar}
        className="anim-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <aside className="anim-fade-up relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-primary/40 bg-surface">
        <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-bd bg-surface px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold">Novidades</h2>
            <p className="text-xs text-muted">O que mudou no Pulsar Finance</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="fx-press rounded-lg border border-bd px-2 py-1 text-sm text-muted transition-colors hover:text-text"
          >
            ✕
          </button>
        </header>

        <div className="anim-stagger flex flex-col gap-6 px-6 py-5">
          {agrupar(CHANGELOG).map(([mes, itens]) => (
            <section key={mes} className="flex flex-col gap-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{rotuloMes(mes)}</h3>
              {itens.map((e) => (
                <article key={`${e.data}-${e.titulo}`} className="flex flex-col gap-1 rounded-card border border-bd bg-surface2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`mk-badge ${e.tag === 'novo' ? 'mk-badge--novo' : e.tag === 'melhoria' ? 'mk-badge--melhoria' : ''}`}>
                      {ROTULO_TAG[e.tag]}
                    </span>
                    <span className="text-[10px] tabular-nums tracking-wider text-muted">
                      {e.data.slice(8, 10)}/{e.data.slice(5, 7)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">{e.titulo}</p>
                  <p className="text-xs leading-relaxed text-muted">{e.desc}</p>
                </article>
              ))}
            </section>
          ))}
        </div>
      </aside>
    </div>
  )
}

/** Item da sidebar que abre o painel e apaga o dot de não-lido. */
export function BotaoNovidades() {
  const { temNaoLido, marcarVisto } = useNovidades()
  const [aberto, setAberto] = useState(false)

  const abrir = () => {
    somSelecao()
    marcarVisto()
    setAberto(true)
  }

  return (
    <>
      <button type="button" onClick={abrir} className="nav-item w-full">
        <span className="nav-item__num">✦</span>
        <span className="flex-1 truncate text-left">Novidades</span>
        {temNaoLido ? <i className="mk-dot shrink-0" aria-label="há novidades não lidas" /> : null}
      </button>
      {aberto ? <PainelNovidades onFechar={() => setAberto(false)} /> : null}
    </>
  )
}
