/**
 * @file Comparativo lado a lado em TELA CHEIA: dois relatórios completos (DRE ou DFC), cada lado
 * com período próprio, totais e tabela inteira com drill-down. Esc fecha. Aberto pela faixa
 * de contexto em qualquer aba — modelagem, painel ou relatórios.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  hojeLocalIso,
  intervaloDoPreset,
  rotuloIntervalo,
  type Preset,
  type Regime,
} from '@/core/periodo'
import type { Movimento } from '@/core/movimento'
import { brl } from '@/lib/money'
import { useDemonstracoesDe, useMesesDe, useMovsDaChave } from '@/lib/useComparativo'
import { MovimentosModal } from './MovimentosModal.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'
import { TabelaDemonstracao } from './TabelaDemonstracao.tsx'
import { TabelaMeses } from './TabelaMeses.tsx'

type Tipo = 'dre' | 'dfc'

const TIPOS: readonly OpcaoSeg<Tipo>[] = [
  { id: 'dre', rotulo: 'DRE' },
  { id: 'dfc', rotulo: 'DFC' },
]
const REGIMES: readonly OpcaoSeg<Regime>[] = [
  { id: 'competencia', rotulo: 'Competência' },
  { id: 'caixa', rotulo: 'Caixa' },
]
const PRESETS: ReadonlyArray<{ id: Preset; rotulo: string }> = [
  { id: 'tudo', rotulo: 'Todo o histórico' },
  { id: 'mes-atual', rotulo: 'Mês atual' },
  { id: 'mes-anterior', rotulo: 'Mês anterior' },
  { id: '3m', rotulo: 'Últimos 3 meses' },
  { id: '6m', rotulo: 'Últimos 6 meses' },
  { id: '12m', rotulo: 'Últimos 12 meses' },
  { id: 'ano', rotulo: 'Ano corrente' },
]

export function ComparativoTelaCheia({ onFechar }: { onFechar: () => void }) {
  const [tipo, setTipo] = useState<Tipo>('dre')
  const [regime, setRegime] = useState<Regime>('competencia')
  const [presetA, setPresetA] = useState<Preset>('tudo')
  const [presetB, setPresetB] = useState<Preset>('mes-atual')
  // Visão de cada lado mora AQUI: com qualquer lado em "Mês a mês" o layout adapta —
  // lados empilhados em largura total (a matriz mensal não cabe em meia tela; report 02/08).
  const [visaoA, setVisaoA] = useState<'total' | 'meses'>('total')
  const [visaoB, setVisaoB] = useState<'total' | 'meses'>('total')
  const expandido = visaoA === 'meses' || visaoB === 'meses'

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 overflow-auto bg-bg p-6">
      <div className={`anim-tab-in mx-auto flex flex-col gap-5 ${expandido ? 'max-w-none' : 'max-w-7xl'}`}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[19px] font-semibold">Comparativo lado a lado</h1>
            <p className="text-sm text-muted">
              Dois períodos, relatório completo em cada lado · drill-down por linha · mesma estrutura
              configurada
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmento opcoes={TIPOS} valor={tipo} onTrocar={setTipo} />
            <Segmento opcoes={REGIMES} valor={regime} onTrocar={setRegime} />
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar comparativo"
              className="fx-press grid h-9 w-9 place-items-center rounded-lg border border-bd text-muted transition-colors hover:border-danger hover:text-danger"
            >
              ✕
            </button>
          </div>
        </header>

        <div className={`grid grid-cols-1 gap-5 ${expandido ? '' : 'lg:grid-cols-2'}`}>
          <Lado titulo="Lado A" preset={presetA} onPreset={setPresetA} tipo={tipo} regime={regime} visao={visaoA} onVisao={setVisaoA} />
          <Lado titulo="Lado B" preset={presetB} onPreset={setPresetB} tipo={tipo} regime={regime} visao={visaoB} onVisao={setVisaoB} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface PropsLado {
  readonly titulo: string
  readonly preset: Preset
  readonly onPreset: (p: Preset) => void
  readonly tipo: Tipo
  readonly regime: Regime
  readonly visao: 'total' | 'meses'
  readonly onVisao: (v: 'total' | 'meses') => void
}

const VISOES: readonly OpcaoSeg<'total' | 'meses'>[] = [
  { id: 'total', rotulo: 'Total' },
  { id: 'meses', rotulo: 'Mês a mês' },
]

function Lado({ titulo, preset, onPreset, tipo, regime, visao, onVisao }: PropsLado) {
  const intervalo = useMemo(() => intervaloDoPreset(preset, hojeLocalIso()), [preset])
  const d = useDemonstracoesDe(intervalo, regime)
  // Trimestre/semestre aberto por mês (pedido 2026-07-29): total consolidado continua,
  // e cada mês vira coluna com AV%/AH% — a matriz que o financeiro conhece da contabilidade.
  const meses = useMesesDe(intervalo, regime)
  const temMeses = meses.length >= 2
  const linhas = tipo === 'dre' ? d.dre : d.dfc
  const receitaBruta = tipo === 'dre' ? (d.dre.find((l) => l.id === 'dre_receita')?.valorCentavos ?? 0) : 0

  // Drill da conta revelada na matriz: nome = período inteiro; célula = aquele mês.
  const movsDaChave = useMovsDaChave(regime, tipo)
  const [drill, setDrill] = useState<{ titulo: string; movimentos: readonly Movimento[] } | null>(null)
  const abrirConta = (chave: string, nome: string, mesIndice: number | null) => {
    const janela = mesIndice === null ? intervalo : (meses[mesIndice]?.intervalo ?? intervalo)
    setDrill({ titulo: `${nome} · ${rotuloIntervalo(janela)}`, movimentos: movsDaChave(chave, janela) })
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-primary/40 bg-primary/5 px-4 py-2.5">
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
            {titulo}
          </span>
          <select
            value={preset}
            onChange={(e) => onPreset(e.target.value as Preset)}
            className="rounded-lg border border-bd bg-surface2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-surface text-text">
                {p.rotulo}
              </option>
            ))}
          </select>
        </span>
        <span className="flex items-center gap-3">
          {temMeses ? <Segmento opcoes={VISOES} valor={visao} onTrocar={onVisao} /> : null}
          <span className="text-xs text-muted">
            {rotuloIntervalo(intervalo)} · {d.totais.qtd} lançamentos
          </span>
        </span>
      </div>

      <div className="flex flex-wrap gap-4 rounded-card border border-bd bg-surface px-4 py-2.5 text-xs tabular-nums">
        <span className="text-accent">▲ {brl(d.totais.entrada)}</span>
        <span className="text-danger">▼ {brl(d.totais.saida)}</span>
        <span className={`font-semibold ${d.totais.saldo < 0 ? 'text-danger' : 'text-text'}`}>
          = {brl(d.totais.saldo)}
        </span>
      </div>

      {visao === 'meses' && temMeses ? (
        <TabelaMeses
          titulo={`${tipo.toUpperCase()} · ${rotuloIntervalo(intervalo)} · mês a mês`}
          meses={meses}
          total={linhas}
          tipo={tipo}
          onConta={abrirConta}
        />
      ) : (
        <TabelaDemonstracao
          titulo={`${tipo.toUpperCase()} · ${rotuloIntervalo(intervalo)}`}
          linhas={linhas}
          grupos={tipo === 'dfc' ? d.espelhoDfc : d.espelho}
          base={receitaBruta}
        />
      )}
      {drill ? (
        <MovimentosModal
          titulo={drill.titulo}
          subtitulo={`Movimentos da conta · ${tipo.toUpperCase()} · regime ${regime}${tipo === 'dfc' ? ' (valores pagos)' : ''}`}
          movimentos={drill.movimentos}
          eixosIniciais={['contraparte']}
          onFechar={() => setDrill(null)}
        />
      ) : null}
    </section>
  )
}
