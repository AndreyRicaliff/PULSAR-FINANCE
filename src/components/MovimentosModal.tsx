/** @file Modal de drill-down de movimentos: KPIs, agrupamento por eixos encadeados e seleção de filial. */
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Movimento } from '@/core/movimento'
import { FilialSelecaoProvider } from '@/lib/filialSelecao'
import { brl } from '@/lib/money'
import { useOverrides } from '@/lib/overrides'
import { ramificar } from './drilldown/arvoreMov'
import { EixoChain } from './drilldown/EixoChain.tsx'
import { GrupoArvore } from './drilldown/GrupoArvore.tsx'
import { TabelaMov } from './drilldown/TabelaMov.tsx'
import { DESCRICAO_EIXO, SEM_AGRUPAR, type Eixo } from './drilldown/rotulos'

interface Props {
  readonly titulo: string
  readonly codigo?: string
  readonly subtitulo: string
  readonly movimentos: readonly Movimento[]
  readonly eixosIniciais?: readonly Eixo[]
  readonly onFechar: () => void
}

export function MovimentosModal({ titulo, codigo, subtitulo, movimentos, eixosIniciais, onFechar }: Props) {
  const { resolvedor } = useOverrides()
  const [eixos, setEixos] = useState<Eixo[]>(() => [...(eixosIniciais ?? ['contraparte'])])
  const arvore = useMemo(() => ramificar(movimentos, eixos, resolvedor), [movimentos, eixos, resolvedor])
  const ultimo = eixos[eixos.length - 1]

  // Portal no body: painéis animados retêm transform e prenderiam o fixed (containing block).
  return createPortal(
    <FilialSelecaoProvider>
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div
        className="anim-pop flex max-h-[85vh] w-full max-w-4xl flex-col rounded-card border border-bd bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <Cabecalho titulo={titulo} codigo={codigo} subtitulo={subtitulo} onFechar={onFechar} />
        <ResumoKpis movimentos={movimentos} />
        <div className="flex flex-col gap-2 border-b border-bd px-6 py-3">
          <EixoChain eixos={eixos} onChange={setEixos} />
          <p className="text-xs leading-relaxed text-muted">
            {eixos.length > 0 ? (
              <span className="font-semibold text-secondary">{arvore.length} grupos no 1º nível · </span>
            ) : null}
            {ultimo ? DESCRICAO_EIXO[ultimo] : SEM_AGRUPAR}
          </p>
        </div>
        <div className="overflow-auto">
          {eixos.length === 0 ? (
            <TabelaMov movimentos={movimentos} />
          ) : (
            arvore.map((no) => <GrupoArvore key={no.chave} no={no} nivel={0} />)
          )}
        </div>
      </div>
    </div>
    </FilialSelecaoProvider>,
    document.body,
  )
}

interface Resumo {
  readonly entradas: number
  readonly saidas: number
  readonly resultado: number
  readonly qtd: number
  readonly tiquete: number
}

/** Sinal pela natureza (R entra, P sai) — mesmo critério de lib/resultado. */
function resumir(movs: readonly Movimento[]): Resumo {
  let entradas = 0
  let saidas = 0
  for (const m of movs) {
    if (m.natureza.toUpperCase() === 'R') entradas += m.valorCentavos
    else saidas += m.valorCentavos
  }
  const qtd = movs.length
  return { entradas, saidas, resultado: entradas - saidas, qtd, tiquete: qtd ? Math.round((entradas + saidas) / qtd) : 0 }
}

function ResumoKpis({ movimentos }: { movimentos: readonly Movimento[] }) {
  const r = useMemo(() => resumir(movimentos), [movimentos])
  return (
    <div className="grid grid-cols-2 gap-px border-b border-bd bg-bd/40 sm:grid-cols-5">
      <Stat rotulo="Entradas" valor={brl(r.entradas)} cor="text-accent" />
      <Stat rotulo="Saídas" valor={brl(-r.saidas)} cor="text-danger" />
      <Stat rotulo="Resultado" valor={brl(r.resultado)} cor={r.resultado >= 0 ? 'text-accent' : 'text-danger'} />
      <Stat rotulo="Movimentos" valor={String(r.qtd)} />
      <Stat rotulo="Tíquete médio" valor={brl(r.tiquete)} />
    </div>
  )
}

function Stat({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="bg-surface px-4 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted">{rotulo}</p>
      <p className={`text-sm font-bold tabular-nums ${cor ?? ''}`}>{valor}</p>
    </div>
  )
}

function Cabecalho({
  titulo,
  codigo,
  subtitulo,
  onFechar,
}: {
  titulo: string
  codigo?: string
  subtitulo: string
  onFechar: () => void
}) {
  return (
    <header className="flex items-start justify-between border-b border-bd px-6 py-4">
      <div>
        {codigo ? <p className="font-mono text-xs text-muted">{codigo}</p> : null}
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="text-sm text-muted">{subtitulo}</p>
      </div>
      <button
        type="button"
        onClick={onFechar}
        className="rounded-lg border border-bd px-3 py-1 text-sm text-muted hover:text-text"
      >
        Fechar
      </button>
    </header>
  )
}
