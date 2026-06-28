/**
 * @file Comparativo lado a lado: mês atual × período selecionado, em DRE e DFC.
 * Períodos têm durações diferentes → a comparação honesta é contra a MÉDIA MENSAL do período
 * (total do período também exibido). Tudo dado real; nada projetado.
 */
import type { LinhaCalc } from '@/core/demonstracao'
import { rotuloIntervalo, type Intervalo } from '@/core/periodo'
import { brl, fracVariacao, pctVariacao } from '@/lib/money'
import { useMesAtual } from '@/lib/useComparativo'
import { useResultado, valorLinha } from '@/lib/useResultado'
import { KpiCard } from '../KpiCard.tsx'

export function RelatorioComparativo() {
  const r = useResultado()
  const mes = useMesAtual()
  // Meses reais com dado no período selecionado — denominador da média mensal.
  const meses = Math.max(1, r.serie.filter((p) => !p.projetado).length)
  const mesmoIntervalo = igual(r.periodo.intervalo, mes.intervalo)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Comparativo — Mês Atual × Período</h1>
        <p className="text-sm text-muted">
          Mês corrente ({rotuloIntervalo(mes.intervalo)}) lado a lado com o período selecionado (
          {rotuloIntervalo(r.periodo.intervalo)}, {meses} {meses === 1 ? 'mês' : 'meses'} com dado) ·
          variação medida contra a <strong>média mensal</strong> do período — durações diferentes não se
          comparam por total
        </p>
      </header>

      {mesmoIntervalo ? (
        <p className="rounded-card border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
          O período selecionado já é o mês atual — escolha outro intervalo no filtro acima para comparar.
        </p>
      ) : null}
      {mes.qtd === 0 ? (
        <p className="rounded-card border border-bd bg-surface p-3 text-sm text-muted">
          0 lançamentos no mês atual no regime “{r.periodo.regime}” — os valores zerados abaixo são reais,
          não placeholder.
        </p>
      ) : null}

      <KpisComparativo mesDre={mes.dre} perDre={r.dre} meses={meses} />
      <TabelaComparativa titulo="DRE — linha a linha" atual={mes.dre} periodo={r.dre} meses={meses} />
      <TabelaComparativa titulo="DFC — linha a linha" atual={mes.dfc} periodo={r.dfc} meses={meses} />
    </div>
  )
}

function KpisComparativo({ mesDre, perDre, meses }: { mesDre: readonly LinhaCalc[]; perDre: readonly LinhaCalc[]; meses: number }) {
  const kpi = (id: string) => ({ mes: valorLinha(mesDre, id), media: valorLinha(perDre, id) / meses })
  const rl = kpi('dre_receita_liq')
  const eb = kpi('dre_ebitda')
  const lq = kpi('dre_liquido')
  return (
    <section className="anim-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard rotulo="Receita Líquida · mês atual" valor={brl(rl.mes)} cor="accent" nota={`média mensal do período: ${brl(rl.media)}`} tendencia={delta(rl.mes, rl.media)} />
      <KpiCard rotulo="EBITDA · mês atual" valor={brl(eb.mes)} cor="secondary" nota={`média mensal do período: ${brl(eb.media)}`} tendencia={delta(eb.mes, eb.media)} />
      <KpiCard rotulo="Resultado Líquido · mês atual" valor={brl(lq.mes)} cor={lq.mes >= 0 ? 'primary' : 'danger'} nota={`média mensal do período: ${brl(lq.media)}`} tendencia={delta(lq.mes, lq.media)} />
    </section>
  )
}

/** Δ% inteiro pro chip do KpiCard — undefined sem base (chip só com dado real). */
function delta(atual: number, base: number): number | undefined {
  const f = fracVariacao(atual, base)
  return f === null ? undefined : Math.round(f * 100)
}

interface PropsTabela {
  readonly titulo: string
  readonly atual: readonly LinhaCalc[]
  readonly periodo: readonly LinhaCalc[]
  readonly meses: number
}

function TabelaComparativa({ titulo, atual, periodo, meses }: PropsTabela) {
  const porId = new Map(atual.map((l) => [l.id, l.valorCentavos]))
  return (
    <div className="overflow-x-auto rounded-card border border-bd bg-surface">
      <div className="flex items-center justify-between gap-4 px-5 pt-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</p>
        <LegendaBarras />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-3 font-medium">Linha</th>
            <th className="px-3 py-3 text-right font-medium">Mês atual</th>
            <th className="px-3 py-3 text-right font-medium">Média mensal</th>
            <th className="px-3 py-3 text-right font-medium">Período (total)</th>
            <th className="px-3 py-3 text-right font-medium">Δ vs média</th>
            <th className="px-5 py-3 font-medium">Lado a lado</th>
          </tr>
        </thead>
        <tbody>
          {periodo.map((l) => (
            <Linha key={l.id} linha={l} mesValor={porId.get(l.id) ?? 0} meses={meses} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Linha({ linha, mesValor, meses }: { linha: LinhaCalc; mesValor: number; meses: number }) {
  const media = linha.valorCentavos / meses
  const frac = fracVariacao(mesValor, media)
  // Valores negativos (despesas): numericamente maior = gastou menos = favorável — o sinal serve aos dois casos.
  const favoravel = mesValor >= media
  return (
    <tr className="border-t border-bd/50">
      <td className="px-5 py-2.5">{linha.nome}</td>
      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{brl(mesValor)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted">{brl(media)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted">{brl(linha.valorCentavos)}</td>
      <td className="px-3 py-2.5 text-right">
        {frac === null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${favoravel ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'}`}>
            {frac >= 0 ? '▲' : '▼'} {pctVariacao(frac)}
          </span>
        )}
      </td>
      <td className="px-5 py-2.5">
        <BarraPar atual={mesValor} media={media} />
      </td>
    </tr>
  )
}

/** Par de barras: mês atual (primary) sobre média mensal (muted) — escala pelo maior dos dois. */
function BarraPar({ atual, media }: { atual: number; media: number }) {
  const max = Math.max(Math.abs(atual), Math.abs(media)) || 1
  const w = (v: number) => `${Math.round((Math.abs(v) / max) * 100)}%`
  return (
    <span className="flex w-28 flex-col gap-0.5">
      <span className="h-1.5 rounded-full bg-primary" style={{ width: w(atual) }} />
      <span className="h-1.5 rounded-full bg-muted/40" style={{ width: w(media) }} />
    </span>
  )
}

function LegendaBarras() {
  return (
    <span className="flex items-center gap-3 text-[11px] text-muted">
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-4 rounded-full bg-primary" /> mês atual
      </span>
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-4 rounded-full bg-muted/40" /> média mensal
      </span>
    </span>
  )
}

function igual(a: Intervalo, b: Intervalo): boolean {
  return a.inicio === b.inicio && a.fim === b.fim
}
