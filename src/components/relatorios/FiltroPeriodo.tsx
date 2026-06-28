/** @file Filtros do módulo de relatórios: presets rápidos + CALENDÁRIO de meses, regime e filial. */
import type { Preset, Regime } from '@/core/periodo'
import { usePeriodo } from '@/lib/periodo'
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

export function FiltroPeriodo({ info }: { info: InfoPeriodo }) {
  const { preset, regime, intervalo, definirPreset, definirCustom, definirRegime } = usePeriodo()
  return (
    <div className="flex flex-col gap-3 rounded-card border border-bd bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Chip key={p.id} ativo={preset === p.id} onClick={() => definirPreset(p.id)}>
            {p.rotulo}
          </Chip>
        ))}
        <div className="mx-1 h-5 w-px bg-bd" />
        {REGIMES.map((r) => (
          <Chip key={r.id} ativo={regime === r.id} onClick={() => definirRegime(r.id)}>
            {r.rotulo}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">Calendário</span>
          <SeletorMeses
            faixa={{ de: intervalo.inicio?.slice(0, 7) ?? null, ate: intervalo.fim?.slice(0, 7) ?? null }}
            onChange={(f: FaixaMeses) =>
              definirCustom({ inicio: f.de ? `${f.de}-01` : null, fim: f.ate ? ultimoDia(f.ate) : null })
            }
          />
        </span>
        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">Filial</span>
          <SeletorFilial />
        </label>
      </div>

      <Resumo info={info} />
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

function Resumo({ info }: { info: InfoPeriodo }) {
  const { comData, total } = info.coberturaData
  const pctData = total ? Math.round((comData / total) * 100) : 0
  const baixaCobertura = pctData < 90
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      <span>
        <strong className="text-text">{info.dentro}</strong> de {info.total} lançamentos no período
        {info.fora > 0 ? ` · ${info.fora} fora` : ''}
        {info.filial && info.foraFilial > 0 ? (
          <span className="text-warn"> · {info.foraFilial} de outras filiais excluídos pelo filtro</span>
        ) : null}
      </span>
      <span className={baixaCobertura ? 'text-warn' : ''}>
        {baixaCobertura ? 'Atenção: ' : ''}
        {pctData}% têm data no regime “{info.regime}”
        {baixaCobertura ? ' — período e projeção cobrem só esse subconjunto' : ''}
      </span>
    </div>
  )
}
