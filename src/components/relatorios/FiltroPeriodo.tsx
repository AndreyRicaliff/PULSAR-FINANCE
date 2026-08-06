/**
 * @file Filtros do módulo de relatórios: presets rápidos + CALENDÁRIO de meses, regime e filial.
 * Fala DUAS línguas: técnica para o operador (contador) e de dono no HUD do cliente, onde
 * também nasce recolhido — ali o filtro é ferramenta secundária, não a abertura da tela.
 */
import { useState } from 'react'
import type { Preset, Regime } from '@/core/periodo'
import { usePeriodo } from '@/lib/periodo'
import { useSomenteLeitura } from '@/lib/somenteLeitura'
import type { InfoPeriodo } from '@/lib/useResultado'
import { SeletorMeses, type FaixaMeses } from '../SeletorMeses.tsx'
import { SeletorFilial } from './SeletorFilial.tsx'

const ultimoDia = (m: string): string => {
  const [a, mes] = [Number(m.slice(0, 4)), Number(m.slice(5, 7))]
  return `${m}-${String(new Date(a, mes, 0).getDate()).padStart(2, '0')}`
}

const PRESETS: readonly { id: Preset; rotulo: string }[] = [
  { id: 'tudo', rotulo: 'Tudo' },
  { id: 'mes-atual', rotulo: 'Mês atual' },
  { id: 'mes-anterior', rotulo: 'Mês anterior' },
  { id: '3m', rotulo: '3 meses' },
  { id: '6m', rotulo: '6 meses' },
  { id: '12m', rotulo: '12 meses' },
  { id: 'ano', rotulo: 'Ano' },
]

const REGIMES: readonly { id: Regime; rotulo: string }[] = [
  { id: 'competencia', rotulo: 'Competência' },
  { id: 'caixa', rotulo: 'Caixa' },
]

/**
 * O mesmo eixo, na língua de quem lê. O operador é contador e quer o termo técnico; o dono
 * do negócio não sabe o que é regime de competência — e não precisa saber para usar o painel.
 */
const REGIMES_CLIENTE: readonly { id: Regime; rotulo: string }[] = [
  { id: 'competencia', rotulo: 'Pela data da venda' },
  { id: 'caixa', rotulo: 'Pelo que já entrou/saiu' },
]

export function FiltroPeriodo({ info }: { info: InfoPeriodo }) {
  const { preset, regime, intervalo, filial, definirPreset, definirCustom, definirRegime, definirFilial } = usePeriodo()
  // No HUD do cliente o filtro é ferramenta secundária: ele abre para LER o resultado, não
  // para recortar. Fica recolhido atrás do resumo, e a linguagem deixa de ser de contador.
  const cliente = useSomenteLeitura()
  const [aberto, setAberto] = useState(!cliente)
  const temRecorte = preset !== 'tudo' || filial.length > 0 || regime !== 'competencia'
  const regimes = cliente ? REGIMES_CLIENTE : REGIMES

  if (cliente && !aberto) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bd bg-surface px-4 py-2.5">
        <Resumo info={info} cliente />
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="fx-press shrink-0 rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-text"
        >
          Ajustar período{temRecorte ? ' ·' : ''}
          {temRecorte ? <span className="ml-1 text-secondary">filtro ativo</span> : null}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-bd/60 rounded-card border border-bd bg-surface">
      {/* Cada linha é um eixo do recorte, rotulado. O bloco anterior empilhava presets e
          regime na mesma fileira de chips — dois eixos diferentes com a mesma aparência. */}
      <Eixo rotulo="Período">
        {PRESETS.map((p) => (
          <Chip key={p.id} ativo={preset === p.id} onClick={() => definirPreset(p.id)}>
            {p.rotulo}
          </Chip>
        ))}
        <SeletorMeses
          faixa={{ de: intervalo.inicio?.slice(0, 7) ?? null, ate: intervalo.fim?.slice(0, 7) ?? null }}
          onChange={(f: FaixaMeses) =>
            definirCustom({ inicio: f.de ? `${f.de}-01` : null, fim: f.ate ? ultimoDia(f.ate) : null })
          }
        />
      </Eixo>

      {/* Regime é EXCLUDENTE por definição: o mesmo lançamento tem data de competência E de
          caixa, então marcar os dois o contaria duas vezes. Multi só onde o recorte é união. */}
      <Eixo
        rotulo={cliente ? 'Contar' : 'Regime'}
        nota={cliente ? 'um jeito por vez' : 'competência × caixa — excludentes'}
      >
        {regimes.map((r) => (
          <Chip key={r.id} ativo={regime === r.id} onClick={() => definirRegime(r.id)}>
            {r.rotulo}
          </Chip>
        ))}
      </Eixo>

      <Eixo rotulo="Filial" nota={filial.length > 1 ? `${filial.length} somadas` : undefined}>
        <SeletorFilial />
        {filial.length > 0 ? (
          <button type="button" onClick={() => definirFilial([])} className="text-[11px] text-muted underline-offset-2 hover:text-secondary hover:underline">
            limpar
          </button>
        ) : null}
      </Eixo>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <Resumo info={info} cliente={cliente} />
        {cliente ? (
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="shrink-0 text-[11px] text-muted underline-offset-2 hover:text-secondary hover:underline"
          >
            recolher
          </button>
        ) : null}
        {temRecorte ? (
          <button
            type="button"
            onClick={() => {
              definirPreset('tudo')
              definirRegime('competencia')
              definirFilial([])
            }}
            className="shrink-0 rounded-md border border-bd px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-primary hover:text-secondary"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Uma linha do painel = um eixo de recorte, com rótulo fixo à esquerda. */
function Eixo({ rotulo, nota, children }: { rotulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
      <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">{rotulo}</span>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {nota ? <span className="text-[11px] text-muted">{nota}</span> : null}
    </div>
  )
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  const cls = ativo
    ? 'border-primary bg-primary/15 text-primary'
    : 'border-bd bg-surface2 text-muted hover:border-primary/50 hover:text-text'
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${cls}`}>
      {children}
    </button>
  )
}

function Resumo({ info, cliente = false }: { info: InfoPeriodo; cliente?: boolean }) {
  const { comData, total } = info.coberturaData
  const pctData = total ? Math.round((comData / total) * 100) : 0
  const baixaCobertura = pctData < 90
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      <span>
        <strong className="text-text">{info.dentro}</strong> de {info.total} lançamentos no período
        {info.fora > 0 ? ` · ${info.fora} fora` : ''}
        {info.filial.length > 0 && info.foraFilial > 0 ? (
          <span className="text-warn"> · {info.foraFilial} de outras filiais excluídos pelo filtro</span>
        ) : null}
      </span>
      {/* O aviso de cobertura é operacional: para o cliente ele só assusta quando está bom
          e confunde quando está ruim. Só aparece para ele quando é DE FATO um problema, e
          então em português de dono — nunca "regime competencia". */}
      {!cliente || baixaCobertura ? (
        <span className={baixaCobertura ? 'text-warn' : ''}>
          {cliente ? (
            <>Atenção: {100 - pctData}% dos lançamentos ainda estão sem data — os totais podem crescer.</>
          ) : (
            <>
              {baixaCobertura ? 'Atenção: ' : ''}
              {pctData}% têm data no regime “{info.regime}”
              {baixaCobertura ? ' — período e projeção cobrem só esse subconjunto' : ''}
            </>
          )}
        </span>
      ) : null}
    </div>
  )
}
