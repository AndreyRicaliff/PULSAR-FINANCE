/**
 * @file Seletor de filial dos relatórios com sparkline por opção: cada filial mostra a
 * linha do resultado mensal do PERÍODO GERAL (histórico completo, independente do filtro
 * de período ativo) com média tracejada — bate o olho e vê quem cresce e quem sangra.
 */
import { useMemo, useState } from 'react'
import { SEM_FILIAL } from '@/core/centros'
import { filtrarPorFilial, mapaAuto, type FiltroFilial } from '@/core/filial'
import { opcoesDaEstrutura } from '@/core/modelo'
import { serieMensal } from '@/core/serie'
import { useCadastros } from '@/lib/cadastros'
import { useMovimentos } from '@/lib/movimentos'
import { brl } from '@/lib/money'
import { usePeriodo } from '@/lib/periodo'
import { useModelo } from '@/lib/useModelo'
import { Sparkline } from '../charts/Sparkline.tsx'

interface Opcao {
  readonly id: FiltroFilial
  readonly rotulo: string
  readonly sub: boolean
}

export function SeletorFilial() {
  const { filial, definirFilial } = usePeriodo()
  const { modelo } = useModelo()
  const [aberto, setAberto] = useState(false)

  const opcoes = useMemo<Opcao[]>(() => {
    const estrutura = opcoesDaEstrutura(modelo.centros.estrutura).filter((o) => o.id !== SEM_FILIAL.id)
    return [
      { id: null, rotulo: 'Todas as filiais', sub: false },
      ...estrutura.map((o) => ({ id: o.id as FiltroFilial, rotulo: o.rotulo.replace('↳ ', ''), sub: o.rotulo.startsWith('↳') })),
      { id: SEM_FILIAL.id, rotulo: SEM_FILIAL.nome, sub: false },
    ]
  }, [modelo.centros.estrutura])

  const series = useSeriesPorFilial(aberto, opcoes)
  const ativa = opcoes.find((o) => o.id === filial) ?? opcoes[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm outline-none ${
          filial ? 'border-primary/60 bg-primary/10 text-secondary' : 'border-bd bg-surface2'
        }`}
      >
        {ativa?.rotulo ?? 'Todas as filiais'}
        <span className="text-[10px] text-muted">▾</span>
      </button>

      {aberto ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-96 w-80 overflow-y-auto rounded-card border border-bd bg-surface shadow-xl">
            {opcoes.map((o) => (
              <LinhaOpcao
                key={o.id ?? 'todas'}
                opcao={o}
                ativa={filial === o.id}
                valores={series.get(o.id) ?? []}
                onEscolher={() => {
                  definirFilial(o.id)
                  setAberto(false)
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

/** Série do resultado mensal por filial — calculada só com o dropdown aberto (lazy). */
function useSeriesPorFilial(aberto: boolean, opcoes: readonly Opcao[]): ReadonlyMap<FiltroFilial, number[]> {
  const { modelo } = useModelo()
  const { regime } = usePeriodo()
  const { movimentos: todosMovs } = useMovimentos()
  const { nomesContrapartes } = useCadastros()
  return useMemo(() => {
    const series = new Map<FiltroFilial, number[]>()
    if (!aberto) return series
    const movs = todosMovs
    const auto = mapaAuto(movs, modelo.centros, nomesContrapartes)
    for (const o of opcoes) {
      const dentro = filtrarPorFilial(movs, o.id, modelo.centros, auto).dentro
      series.set(o.id, serieMensal(dentro, modelo.contas, regime).map((p) => p.saldo))
    }
    return series
  }, [aberto, opcoes, modelo, regime, todosMovs, nomesContrapartes])
}

function LinhaOpcao({
  opcao,
  ativa,
  valores,
  onEscolher,
}: {
  opcao: Opcao
  ativa: boolean
  valores: readonly number[]
  onEscolher: () => void
}) {
  const media = valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0
  return (
    <button
      type="button"
      onClick={onEscolher}
      title={valores.length ? `média mensal: ${brl(media)}` : 'sem movimentos atribuídos'}
      className={`flex w-full items-center justify-between gap-3 border-b border-bd/40 px-3 py-2 text-left text-sm last:border-0 hover:bg-surface2/50 ${
        ativa ? 'bg-primary/10 text-secondary' : ''
      }`}
    >
      <span className={`truncate ${opcao.sub ? 'pl-4 text-muted' : 'font-medium'}`}>
        {opcao.sub ? '↳ ' : ''}
        {opcao.rotulo}
      </span>
      <Sparkline valores={valores} cor={media >= 0 ? 'rgb(var(--c-accent))' : 'rgb(var(--c-danger))'} />
    </button>
  )
}
