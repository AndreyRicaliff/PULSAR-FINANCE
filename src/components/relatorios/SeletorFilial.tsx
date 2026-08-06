/**
 * @file Seletor de filiais MULTI-SELEÇÃO (pedido 06/08) com sparkline por opção: cada filial
 * mostra a linha do resultado mensal do PERÍODO GERAL (histórico completo, independente do
 * filtro ativo) com média — bate o olho e vê quem cresce e quem sangra.
 *
 * Multi porque o recorte natural do BPO é um conjunto: "as três lojas do centro". Marcar uma
 * a uma e anotar no papel era o que sobrava. Nada selecionado = todas (o vazio já diz isso).
 */
import { useMemo, useState } from 'react'
import { SEM_FILIAL } from '@/core/centros'
import { filtrarPorFilial, mapaAuto, type FiltroFilial } from '@/core/filial'
import { opcoesDaEstrutura } from '@/core/modelo'
import { serieMensal } from '@/core/serie'
import { normalizarTexto } from '@/core/texto'
import { useCadastros } from '@/lib/cadastros'
import { useMovimentos } from '@/lib/movimentos'
import { brl } from '@/lib/money'
import { usePeriodo } from '@/lib/periodo'
import { useModelo } from '@/lib/useModelo'
import { Sparkline } from '../charts/Sparkline.tsx'

interface Opcao {
  readonly id: string
  readonly rotulo: string
  readonly sub: boolean
}

/** Resumo do gatilho: o operador precisa saber o recorte sem abrir o painel. */
function rotuloDoFiltro(filial: FiltroFilial, opcoes: readonly Opcao[]): string {
  if (filial.length === 0) return 'Todas as filiais'
  if (filial.length === 1) return opcoes.find((o) => o.id === filial[0])?.rotulo ?? '1 filial'
  if (filial.length === opcoes.length) return 'Todas as filiais'
  return `${filial.length} filiais`
}

export function SeletorFilial() {
  const { filial, definirFilial, alternarFilial } = usePeriodo()
  const { modelo } = useModelo()
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')

  const opcoes = useMemo<Opcao[]>(() => {
    const estrutura = opcoesDaEstrutura(modelo.centros.estrutura).filter((o) => o.id !== SEM_FILIAL.id)
    return [
      ...estrutura.map((o) => ({ id: o.id, rotulo: o.rotulo.replace('↳ ', ''), sub: o.rotulo.startsWith('↳') })),
      { id: SEM_FILIAL.id, rotulo: SEM_FILIAL.nome, sub: false },
    ]
  }, [modelo.centros.estrutura])

  const visiveis = useMemo(() => {
    const q = normalizarTexto(busca.trim())
    return q ? opcoes.filter((o) => normalizarTexto(o.rotulo).includes(q)) : opcoes
  }, [opcoes, busca])

  const series = useSeriesPorFilial(aberto, opcoes)
  const selecionadas = new Set(filial)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm outline-none transition-colors ${
          filial.length ? 'border-primary/60 bg-primary/10 text-secondary' : 'border-bd bg-surface2 hover:border-primary/40'
        }`}
      >
        {rotuloDoFiltro(filial, opcoes)}
        {filial.length > 1 ? (
          <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold tabular-nums">{filial.length}</span>
        ) : null}
        <span className="text-[10px] text-muted">▾</span>
      </button>

      {aberto ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute left-0 top-full z-50 mt-1.5 flex max-h-[26rem] w-96 flex-col overflow-hidden rounded-card border border-bd bg-surface shadow-xl">
            <div className="flex flex-col gap-2 border-b border-bd px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Filiais · {filial.length ? `${filial.length} selecionada${filial.length > 1 ? 's' : ''}` : 'todas'}
                </span>
                <div className="flex items-center gap-1">
                  <MiniAcao rotulo="Todas" onClick={() => definirFilial(opcoes.map((o) => o.id))} />
                  <MiniAcao rotulo="Limpar" onClick={() => definirFilial([])} desabilitado={filial.length === 0} />
                </div>
              </div>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar filial…"
                className="w-full rounded-lg border border-bd bg-surface2 px-2.5 py-1.5 text-sm text-text outline-none placeholder:text-muted/70 focus:border-primary"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {visiveis.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted">Nenhuma filial com “{busca}”.</p>
              ) : (
                visiveis.map((o) => (
                  <LinhaOpcao
                    key={o.id}
                    opcao={o}
                    marcada={selecionadas.has(o.id)}
                    valores={series.get(o.id) ?? []}
                    onAlternar={() => alternarFilial(o.id)}
                  />
                ))
              )}
            </div>

            <p className="border-t border-bd px-3 py-2 text-[11px] text-muted">
              {filial.length > 1 ? 'Os números somam as filiais marcadas.' : 'Marque mais de uma para ver o consolidado.'}
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}

function MiniAcao({ rotulo, onClick, desabilitado }: { rotulo: string; onClick: () => void; desabilitado?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className="rounded-md border border-bd px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-primary hover:text-secondary disabled:opacity-40 disabled:hover:border-bd disabled:hover:text-muted"
    >
      {rotulo}
    </button>
  )
}

/** Série do resultado mensal por filial — calculada só com o painel aberto (lazy). */
function useSeriesPorFilial(aberto: boolean, opcoes: readonly Opcao[]): ReadonlyMap<string, number[]> {
  const { modelo } = useModelo()
  const { regime } = usePeriodo()
  const { movimentos: todosMovs } = useMovimentos()
  const { nomesContrapartes } = useCadastros()
  return useMemo(() => {
    const series = new Map<string, number[]>()
    if (!aberto) return series
    const auto = mapaAuto(todosMovs, modelo.centros, nomesContrapartes)
    for (const o of opcoes) {
      const dentro = filtrarPorFilial(todosMovs, [o.id], modelo.centros, auto).dentro
      series.set(o.id, serieMensal(dentro, modelo.contas, regime).map((p) => p.saldo))
    }
    return series
  }, [aberto, opcoes, modelo, regime, todosMovs, nomesContrapartes])
}

function LinhaOpcao({
  opcao,
  marcada,
  valores,
  onAlternar,
}: {
  opcao: Opcao
  marcada: boolean
  valores: readonly number[]
  onAlternar: () => void
}) {
  const media = valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0
  return (
    <button
      type="button"
      onClick={onAlternar}
      role="checkbox"
      aria-checked={marcada}
      title={valores.length ? `média mensal: ${brl(media)}` : 'sem movimentos atribuídos'}
      className={`flex w-full items-center gap-3 border-b border-bd/40 px-3 py-2 text-left text-sm last:border-0 transition-colors hover:bg-surface2/60 ${
        marcada ? 'bg-primary/10' : ''
      }`}
    >
      <Caixa marcada={marcada} />
      <span className={`min-w-0 flex-1 truncate ${opcao.sub ? 'pl-3 text-muted' : 'font-medium'} ${marcada ? 'text-secondary' : ''}`}>
        {opcao.sub ? '↳ ' : ''}
        {opcao.rotulo}
      </span>
      <Sparkline valores={valores} cor={media >= 0 ? 'rgb(var(--c-accent))' : 'rgb(var(--c-danger))'} />
    </button>
  )
}

/** Caixa de marcação desenhada: o input nativo não acompanha os tokens do tema. */
function Caixa({ marcada }: { marcada: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        marcada ? 'border-primary bg-primary text-white' : 'border-bd bg-surface2'
      }`}
    >
      {marcada ? (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6.5L4.5 9L10 3" />
        </svg>
      ) : null}
    </span>
  )
}
