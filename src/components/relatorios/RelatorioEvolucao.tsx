/** @file Evolução mensal com projeção (regressão linear / média móvel) — sempre rotulada estimativa. */
import { useMemo, useState } from 'react'
import { crescimento, projetar, type MetodoProj, type PontoSerie } from '@/core/serie'
import { brl, pctVariacao } from '@/lib/money'
import { useResultado } from '@/lib/useResultado'
import { GraficoExpansivel } from '../charts/GraficoExpansivel.tsx'
import { LinhaTempo, type PontoTempo } from '../charts/LinhaTempo.tsx'
import { KpiCard } from '../KpiCard.tsx'
import { Segmento, type OpcaoSeg } from '../Segmento.tsx'

type Metrica = 'saldo' | 'entrada' | 'saida'

const METRICAS: readonly OpcaoSeg<Metrica>[] = [
  { id: 'saldo', rotulo: 'Resultado' },
  { id: 'entrada', rotulo: 'Entradas' },
  { id: 'saida', rotulo: 'Saídas' },
]
const METODOS: readonly OpcaoSeg<MetodoProj>[] = [
  { id: 'linear', rotulo: 'Tendência linear' },
  { id: 'media-movel', rotulo: 'Média móvel' },
]
const COR: Readonly<Record<Metrica, string>> = {
  saldo: 'rgb(var(--c-primary))',
  entrada: 'rgb(var(--c-accent))',
  saida: 'rgb(var(--c-danger))',
}

export function RelatorioEvolucao() {
  const { serieContinua: serie } = useResultado()
  const [metrica, setMetrica] = useState<Metrica>('saldo')
  const [metodo, setMetodo] = useState<MetodoProj>('linear')
  const [horizonte, setHorizonte] = useState(6)

  const proj = useMemo(() => projetar(serie, metodo, horizonte), [serie, metodo, horizonte])
  const pontos = useMemo<PontoTempo[]>(
    () => [...serie, ...proj].map((p) => ({ rotulo: p.rotulo, valor: p[metrica], projetado: p.projetado })),
    [serie, proj, metrica],
  )

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Evolução & Projeção</h1>
        <p className="text-sm text-muted">
          Série mensal contínua (histórico completo, independe do período escolhido para DRE/DFC) · a projeção é <strong>estimativa</strong> (linha
          tracejada), nunca dado real
        </p>
      </header>

      <Resumo serie={serie} proj={proj} metrica={metrica} />

      <div className="flex flex-wrap items-center gap-3">
        <Segmento opcoes={METRICAS} valor={metrica} onTrocar={setMetrica} />
        <Segmento opcoes={METODOS} valor={metodo} onTrocar={setMetodo} />
        <Horizonte valor={horizonte} onTrocar={setHorizonte} />
      </div>

      <GraficoExpansivel titulo="Evolução mensal · histórico + projeção (tracejado)">
        <LinhaTempo pontos={pontos} cor={COR[metrica]} />
      </GraficoExpansivel>
    </div>
  )
}

function Resumo({ serie, proj, metrica }: { serie: readonly PontoSerie[]; proj: readonly PontoSerie[]; metrica: Metrica }) {
  if (serie.length < 2) return null
  const vals = serie.map((p) => p[metrica])
  const media = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
  const ultimo = vals[vals.length - 1] ?? 0
  const fimProj = proj[proj.length - 1]
  const projValor = fimProj ? fimProj[metrica] : 0
  const cresc = crescimento(serie, metrica)
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard rotulo="Média mensal (histórico)" valor={brl(media)} cor="secondary" nota="Linha pontilhada no gráfico" />
      <KpiCard rotulo="Último mês real" valor={brl(ultimo)} cor="primary" />
      <KpiCard
        rotulo="Crescimento MoM"
        valor={pctVariacao(cresc.mom)}
        cor={cresc.mom !== null && cresc.mom < 0 ? 'danger' : 'accent'}
        nota="Último mês vs anterior (histórico, sem projeção)"
      />
      <KpiCard rotulo={`Projeção em ${proj.length}m (estimativa)`} valor={proj.length ? brl(projValor) : '—'} cor="warn" nota="linha tracejada no gráfico" />
    </section>
  )
}

function Horizonte({ valor, onTrocar }: { valor: number; onTrocar: (n: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Horizonte
      <select
        value={valor}
        onChange={(e) => onTrocar(Number(e.target.value))}
        className="rounded-lg border border-bd bg-surface2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary"
      >
        <option value={3}>3 meses</option>
        <option value={6}>6 meses</option>
        <option value={12}>12 meses</option>
      </select>
    </label>
  )
}
