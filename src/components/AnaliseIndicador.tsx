/** @file Modal de análise profunda de um indicador: série ampliada, estatísticas e tabela mensal. */
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { fmtIndicador, type PontoIndicador } from '@/lib/indicadores'
import { fracVariacao, pctVariacao } from '@/lib/money'
import { SerieIndicador } from './charts/SerieIndicador.tsx'

interface Props {
  readonly rotulo: string
  readonly valorAtual: string
  readonly nota?: string
  /** Cor do indicador como expressão CSS — ex.: 'rgb(var(--c-accent))'. */
  readonly cor: string
  readonly serie: readonly PontoIndicador[]
  readonly onFechar: () => void
}

export function AnaliseIndicador({ rotulo, valorAtual, nota, cor, serie, onFechar }: Props) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  const percentual = serie[0]!.percentual
  const fmt = (v: number) => fmtIndicador(v, percentual)
  const ultimo = serie[serie.length - 1]!
  const penultimo = serie[serie.length - 2]
  const media = serie.reduce((s, p) => s + p.valor, 0) / serie.length
  const melhor = serie.reduce((a, b) => (b.valor > a.valor ? b : a))
  const pior = serie.reduce((a, b) => (b.valor < a.valor ? b : a))
  const mom = penultimo ? fracVariacao(ultimo.valor, penultimo.valor) : null
  const noPeriodo = fracVariacao(ultimo.valor, serie[0]!.valor)

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onFechar}>
      <div
        className="anim-pop flex max-h-[92vh] w-full max-w-3xl flex-col gap-5 overflow-auto rounded-card border border-bd bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{rotulo}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{valorAtual}</p>
            {nota ? <p className="mt-1 text-xs text-muted">{nota}</p> : null}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar análise"
            className="fx-press grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-bd text-muted transition-colors hover:border-danger hover:text-danger"
          >
            ✕
          </button>
        </header>

        <SerieIndicador pontos={serie} cor={cor} />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat rotulo={`Último mês (${ultimo.rotulo})`} valor={fmt(ultimo.valor)} />
          <Stat rotulo="Média do período" valor={fmt(media)} />
          <Stat rotulo="Variação MoM" valor={pctVariacao(mom)} classe={corVariacao(mom)} />
          <Stat rotulo={`Melhor mês (${melhor.rotulo})`} valor={fmt(melhor.valor)} classe="text-accent" />
          <Stat rotulo={`Pior mês (${pior.rotulo})`} valor={fmt(pior.valor)} classe="text-danger" />
          <Stat rotulo={`${serie[0]!.rotulo} → ${ultimo.rotulo}`} valor={pctVariacao(noPeriodo)} classe={corVariacao(noPeriodo)} />
        </section>

        <TabelaMensal serie={serie} percentual={percentual} />
      </div>
    </div>,
    document.body,
  )
}

function corVariacao(frac: number | null): string {
  if (frac === null) return ''
  return frac >= 0 ? 'text-accent' : 'text-danger'
}

function Stat({ rotulo, valor, classe }: { rotulo: string; valor: ReactNode; classe?: string }) {
  return (
    <div className="rounded-lg border border-bd bg-surface2 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted">{rotulo}</p>
      <p className={`mt-0.5 text-sm font-bold tabular-nums ${classe ?? ''}`}>{valor}</p>
    </div>
  )
}

function TabelaMensal({ serie, percentual }: { serie: readonly PontoIndicador[]; percentual: boolean }) {
  // Mais recente primeiro — é o que se analisa.
  const linhas = [...serie].reverse()
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-bd">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Mês</th>
            <th className="px-4 py-2 text-right font-medium">Valor</th>
            <th className="px-4 py-2 text-right font-medium">Δ vs mês anterior</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((p, i) => {
            const ant = linhas[i + 1]
            const frac = ant ? fracVariacao(p.valor, ant.valor) : null
            return (
              <tr key={p.rotulo} className="border-t border-bd/50">
                <td className="px-4 py-2 tabular-nums">{p.rotulo}</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmtIndicador(p.valor, percentual)}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${corVariacao(frac)}`}>{pctVariacao(frac)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
