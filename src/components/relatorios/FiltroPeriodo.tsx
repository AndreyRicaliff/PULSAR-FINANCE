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
  const { preset, regime, intervalo, filial, definirPreset, definirCustom, definirRegime, definirFilial } = usePeriodo()
  const temRecorte = preset !== 'tudo' || filial.length > 0 || regime !== 'competencia'
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
      <Eixo rotulo="Regime" nota="competência × caixa — excludentes">
        {REGIMES.map((r) => (
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
        <Resumo info={info} />
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

function Resumo({ info }: { info: InfoPeriodo }) {
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
      <span className={baixaCobertura ? 'text-warn' : ''}>
        {baixaCobertura ? 'Atenção: ' : ''}
        {pctData}% têm data no regime “{info.regime}”
        {baixaCobertura ? ' — período e projeção cobrem só esse subconjunto' : ''}
      </span>
      <AvisoAncoragem info={info} />
    </div>
  )
}

/**
 * O aviso que "100% com data" escondia: em competência, evento de extrato (sem emissão)
 * ancora pela data de PAGAMENTO. Medido em prod (07/08): 94–99,9% dos lançamentos em 4
 * tenants Omie — a DRE desses clientes é, na prática, regime de caixa. Isso não é erro do
 * app (a alternativa era o evento sumir da série), mas a equipe PRECISA ver quando o mês
 * que ela lê está ancorado pelo caixa — "registro que muda de mês" nasce exatamente aqui.
 */
function AvisoAncoragem({ info }: { info: InfoPeriodo }) {
  const { emprestadas, semData, total } = info.ancoragem
  if (!total || info.regime !== 'competencia' || (emprestadas === 0 && semData === 0)) return null
  const pct = Math.round((emprestadas / total) * 100)
  return (
    <span
      className={pct >= 50 ? 'text-warn' : ''}
      title="Lançamentos de extrato bancário não têm data de emissão — a única data real deles é a do pagamento. Nesses casos a competência é ancorada pelo caixa."
    >
      {emprestadas > 0 ? `${emprestadas} (${pct}%) ancorados pela data de pagamento — extrato sem emissão` : null}
      {emprestadas > 0 && semData > 0 ? ' · ' : null}
      {semData > 0 ? `${semData} sem data utilizável` : null}
    </span>
  )
}
