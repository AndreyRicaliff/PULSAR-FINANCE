/**
 * @file Seletor de período ESTILO CALENDÁRIO (padrão do produto para periodização):
 * popover com grade de 12 meses por ano, navegação ‹ ano ›, seleção de intervalo em
 * dois cliques (início → fim, com swap automático) e atalho "Tudo". Trabalha em
 * 'aaaa-mm'; quem consome converte para Intervalo de datas se precisar.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export interface FaixaMeses {
  readonly de: string | null // 'aaaa-mm'
  readonly ate: string | null
}

interface Props {
  readonly faixa: FaixaMeses
  readonly onChange: (faixa: FaixaMeses) => void
  /** Limites do calendário (anos navegáveis) — derive do domínio de dados. */
  readonly minMes?: string
  readonly maxMes?: string
}

export const rotuloMes = (m: string | null): string => (m ? `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}` : '')

export function SeletorMeses({ faixa, onChange, minMes, maxMes }: Props) {
  const [aberto, setAberto] = useState(false)
  const hoje = new Date()
  const [ano, setAno] = useState(() => Number((faixa.ate ?? faixa.de ?? `${hoje.getFullYear()}`).slice(0, 4)))
  // 1º clique marca o início pendente; 2º fecha a faixa.
  const [pendente, setPendente] = useState<string | null>(null)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  const anoMin = minMes ? Number(minMes.slice(0, 4)) : ano - 6
  const anoMax = maxMes ? Number(maxMes.slice(0, 4)) : ano + 1

  const clicar = (mes: string) => {
    if (!pendente) {
      setPendente(mes)
      onChange({ de: mes, ate: mes })
      return
    }
    const [de, ate] = pendente <= mes ? [pendente, mes] : [mes, pendente]
    setPendente(null)
    onChange({ de, ate })
    setAberto(false)
  }

  const dentro = (mes: string) => faixa.de !== null && faixa.ate !== null && mes >= faixa.de && mes <= faixa.ate
  const borda = (mes: string) => mes === faixa.de || mes === faixa.ate

  const rotulo = useMemo(() => {
    if (!faixa.de && !faixa.ate) return 'Todo o período'
    if (faixa.de === faixa.ate) return rotuloMes(faixa.de)
    return `${rotuloMes(faixa.de)} → ${rotuloMes(faixa.ate)}`
  }, [faixa])

  return (
    <div ref={raiz} className="relative inline-block">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="fx-press flex items-center gap-2 rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm text-text transition-colors hover:border-primary"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        {rotulo}
        <span className="text-muted">▾</span>
      </button>

      {aberto ? (
        <div className="anim-pop absolute left-0 top-full z-40 mt-2 w-64 rounded-card border border-bd bg-surface p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setAno((a) => Math.max(anoMin, a - 1))} disabled={ano <= anoMin} className="grid h-7 w-7 place-items-center rounded-lg border border-bd text-muted hover:border-primary disabled:opacity-30">‹</button>
            <span className="text-sm font-bold tabular-nums">{ano}</span>
            <button type="button" onClick={() => setAno((a) => Math.min(anoMax, a + 1))} disabled={ano >= anoMax} className="grid h-7 w-7 place-items-center rounded-lg border border-bd text-muted hover:border-primary disabled:opacity-30">›</button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MESES.map((nome, i) => {
              const mes = `${ano}-${String(i + 1).padStart(2, '0')}`
              const desabilitado = (minMes !== undefined && mes < minMes) || (maxMes !== undefined && mes > maxMes)
              return (
                <button
                  key={mes}
                  type="button"
                  disabled={desabilitado}
                  onClick={() => clicar(mes)}
                  className={`rounded-lg px-1 py-1.5 text-xs font-semibold transition-colors disabled:opacity-25 ${
                    borda(mes)
                      ? 'bg-gradient-to-r from-primary to-secondary text-white'
                      : dentro(mes)
                        ? 'bg-primary/25 text-text'
                        : 'bg-surface2 text-muted hover:text-text hover:bg-primary/15'
                  }`}
                >
                  {nome}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted">{pendente ? 'Agora clique no mês final' : 'Clique em início e fim'}</span>
            <button
              type="button"
              onClick={() => { setPendente(null); onChange({ de: null, ate: null }); setAberto(false) }}
              className="rounded-md border border-bd px-2 py-1 text-muted hover:border-primary hover:text-primary"
            >
              Tudo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
