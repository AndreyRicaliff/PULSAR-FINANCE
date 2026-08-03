/**
 * @file Comparativo de CAPEX (Camada Semântica) — sobrepõe a série mensal do CAPEX
 * realizado (caixa) contra séries escolhidas pelo operador: linhas da DFC (mesma base,
 * comparação limpa), Depreciação da DRE (competência — aviso de base mista), orçado
 * (só provedor com módulo de orçamento) e projeção (sempre estimativa, tracejada).
 * Reusa o core de CAPEX (resumoCapex/adesaoCapex) — nenhuma fórmula paralela.
 * EBITDA/receita ficam de fora do overlay de propósito: escala 10–100× maior esmagaria
 * as linhas de CAPEX; razão em KPI comunica melhor.
 */
import { useMemo, useState } from 'react'
import { capexDoNo, resumoCapex } from '@/core/capex'
import type { BaldeCapex, SerieDesenho } from '@/core/capexComparativo'
import { movimentosCaixa, type Movimento } from '@/core/movimento'
import { dataDoMovimento } from '@/core/periodo'
import { temOrcamento } from '@/core/provedor'
import type { MetodoProj } from '@/core/serie'
import { useClientes, useProvedor } from '@/lib/clientes'
import { brl } from '@/lib/money'
import { CATALOGO, useComparativoCapexDados, type IdComparavel } from '@/lib/useComparativoCapexDados'
import { useOrcamento } from '@/lib/useOrcamento'
import { useResultado } from '@/lib/useResultado'
import { ComparativoLinhas } from './charts/ComparativoLinhas.tsx'
import { GraficoExpansivel } from './charts/GraficoExpansivel.tsx'
import { KpiCard } from './KpiCard.tsx'
import { MovimentosModal } from './MovimentosModal.tsx'
import { FiltroPeriodo } from './relatorios/FiltroPeriodo.tsx'
import { Segmento } from './Segmento.tsx'

const MAX_SELECIONADAS = 4 // acima disso o overlay vira macarrão — razões vivem nos KPIs

const ROTULO_BALDE: Readonly<Record<BaldeCapex, string>> = {
  total: 'Investimento + Manutenção',
  investimento: 'Investimento',
  manutencao: 'Manutenção',
}

export function ComparativoCapexPanel() {
  const provedor = useProvedor()
  const { ativo } = useClientes()
  const r = useResultado()
  const orc = useOrcamento()

  const resumo = useMemo(() => resumoCapex(r.movimentos, r.conc), [r.movimentos, r.conc])

  const [balde, setBalde] = useState<BaldeCapex>('total')
  const [selecionadas, setSelecionadas] = useState<readonly IdComparavel[]>(['dfc_inv'])
  const [horizonte, setHorizonte] = useState<'0' | '3' | '6' | '12'>('0')
  const [metodo, setMetodo] = useState<MetodoProj>('linear')

  const ofereceOrcado = temOrcamento(ativo.provedor)
  const dados = useComparativoCapexDados({
    resumo,
    conc: r.conc,
    intervalo: r.periodo.intervalo,
    regime: r.periodo.regime,
    filial: r.periodo.filial,
    balde,
    selecionadas,
    horizonte: Number(horizonte),
    metodo,
    orcMeses: orc.meses,
  })

  const alternar = (id: IdComparavel) =>
    setSelecionadas((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]))

  const temCompetencia = selecionadas.includes('dre_depreciacao')

  // Drill até o movimento — mesmo modal do resto do app (padrão RelatorioCapex).
  const [drill, setDrill] = useState<{ titulo: string; movimentos: readonly Movimento[] } | null>(null)
  const caixa = useMemo(() => movimentosCaixa(r.movimentos), [r.movimentos])
  const abrirMes = (mes: string) => {
    const noPorId = new Map(r.conc.estrutura.map((n) => [n.id, n]))
    setDrill({
      // O drill respeita o BALDE selecionado — o modal tem que fechar com a célula clicada.
      titulo: `CAPEX${balde === 'total' ? '' : ` · ${ROTULO_BALDE[balde]}`} · ${rotuloMes(mes)}`,
      movimentos: caixa.filter((m) => {
        const no = noPorId.get(r.conc.mapa[m.categoria] ?? '')
        const tipo = no ? capexDoNo(no, no.paiId ? noPorId.get(no.paiId) : undefined) : undefined
        if (!tipo || (balde !== 'total' && tipo !== balde)) return false
        return (dataDoMovimento(m, 'caixa') ?? '').slice(0, 7) === mes
      }),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-extrabold">Comparativo de CAPEX</h2>
        <p className="text-sm text-muted">
          CAPEX realizado na base de <strong>caixa</strong> (baixas {provedor.de}) sobreposto às séries que você
          escolher · marcação de CAPEX é por empresa, na Matriz de Classificações
        </p>
      </header>

      <FiltroPeriodo info={r.periodo} />

      {!resumo.temNoMarcado ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
          Nenhum grupo marcado como CAPEX nesta empresa ainda. Abra a Matriz de Classificações, clique com o
          botão direito no grupo/subgrupo (ex.: Aquisição de Imobilizado, Manutenção e Conservação) e escolha
          CAPEX → Investimento ou Manutenção.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-card border border-bd bg-surface p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Configuração do comparativo</h3>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">CAPEX:</span>
                <Segmento
                  opcoes={[
                    { id: 'total', rotulo: 'Total' },
                    { id: 'investimento', rotulo: 'Investimento' },
                    { id: 'manutencao', rotulo: 'Manutenção' },
                  ]}
                  valor={balde}
                  onTrocar={setBalde}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Projeção:</span>
                <Segmento
                  opcoes={[
                    { id: '0', rotulo: 'Sem' },
                    { id: '3', rotulo: '3m' },
                    { id: '6', rotulo: '6m' },
                    { id: '12', rotulo: '12m' },
                  ]}
                  valor={horizonte}
                  onTrocar={setHorizonte}
                />
                {horizonte !== '0' ? (
                  <Segmento
                    opcoes={[
                      { id: 'linear', rotulo: 'Linear' },
                      { id: 'media-movel', rotulo: 'Média móvel' },
                    ]}
                    valor={metodo}
                    onTrocar={setMetodo}
                  />
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATALOGO.map((c) => {
                const sel = selecionadas.includes(c.id)
                const semFonte = c.id === 'orcado' && !ofereceOrcado
                const lotado = !sel && selecionadas.length >= MAX_SELECIONADAS
                return (
                  <button
                    key={c.id}
                    type="button"
                    // Chip SELECIONADO nunca trava: precisa continuar clicável pra desmarcar
                    // (série ficava presa ao trocar pra cliente sem orçamento — review 03/08).
                    disabled={(semFonte || lotado) && !sel}
                    onClick={() => alternar(c.id)}
                    aria-pressed={sel}
                    title={
                      semFonte
                        ? sel
                          ? `O ${provedor.nome} não expõe módulo de orçamento — clique para remover a série sem fonte.`
                          : `O ${provedor.nome} não expõe módulo de orçamento — série sem fonte para este cliente.`
                        : lotado
                          ? `Até ${MAX_SELECIONADAS} séries além do CAPEX — desmarque uma para trocar.`
                          : undefined
                    }
                    className={`fx-press flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      sel ? 'border-primary bg-primary/10 text-text' : 'border-bd text-muted hover:border-primary hover:text-text'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-sm" style={{ background: c.cor }} />
                    {c.rotulo}
                    <span className="text-[10px] uppercase tracking-wide text-muted/70">{ROTULO_BASE[c.base]}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted">
              Séries da DFC são ancoradas pela <strong>baixa</strong> (caixa), igual ao CAPEX — independem do
              regime do filtro. Projeção é sempre estimativa (tracejada), ajustada só nos meses com atividade.
            </p>
            {temCompetencia ? (
              <p className="rounded-card border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
                Base mista: CAPEX é <strong>caixa</strong> (baixas) e a Depreciação da DRE é{' '}
                <strong>competência</strong> — compare tendência e ordem de grandeza, não centavo contra centavo.
              </p>
            ) : null}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              rotulo={`CAPEX no período · ${ROTULO_BALDE[balde]}`}
              valor={brl(dados.capexPeriodo)}
              cor="primary"
              nota="Base caixa (baixas)"
            />
            <KpiCard
              rotulo="CAPEX ÷ Fluxo de Investimento"
              valor={dados.razaoInv === null ? '—' : `${dados.razaoInv}%`}
              cor="accent"
              nota="Quanto do caixa de investimento virou ativo — aplicações e resgates NÃO são CAPEX"
            />
            <KpiCard
              rotulo="CAPEX ÷ Depreciação"
              valor={dados.razaoDep === null ? '—' : `${dados.razaoDep}%`}
              cor="warn"
              nota="Reinvestimento vs desgaste · base caixa × competência (leia como tendência)"
            />
          </section>

          {dados.eixo.length < 2 ? (
            <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
              Há grupos marcados como CAPEX, mas o período selecionado não tem meses suficientes para comparar.
              Amplie o intervalo no filtro acima.
            </p>
          ) : (
            <>
              <GraficoExpansivel titulo={`Comparativo mensal · CAPEX (${ROTULO_BALDE[balde]}) × séries selecionadas`}>
                <ComparativoLinhas meses={dados.eixoTotal} series={dados.series} />
              </GraficoExpansivel>
              <TabelaComparativa dados={dados} onAbrirMes={abrirMes} />
            </>
          )}
        </>
      )}

      {drill ? (
        <MovimentosModal
          titulo={drill.titulo}
          subtitulo={`Baixas do período (base caixa) · dados crus ${provedor.de}`}
          movimentos={drill.movimentos}
          eixosIniciais={['contraparte']}
          onFechar={() => setDrill(null)}
        />
      ) : null}
    </div>
  )
}

const ROTULO_BASE: Readonly<Record<string, string>> = {
  caixa: 'caixa',
  competencia: 'compet.',
  orcado: 'orçado',
}

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`

function TabelaComparativa({
  dados,
  onAbrirMes,
}: {
  dados: { eixo: readonly string[]; eixoTotal: readonly string[]; series: readonly SerieDesenho[] }
  onAbrirMes: (mes: string) => void
}) {
  return (
    <div className="max-h-[28rem] overflow-auto rounded-card border border-bd">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Mês</th>
            {dados.series.map((s) => (
              <th key={s.id} className="whitespace-nowrap px-4 py-2 text-right font-medium">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: s.cor }} />
                {s.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.eixoTotal.map((mes, i) => {
            const projetado = i >= dados.eixo.length
            return (
              <tr
                key={mes}
                onClick={projetado ? undefined : () => onAbrirMes(mes)}
                title={projetado ? 'Mês projetado — estimativa, sem movimentos' : 'Clique para ver as baixas de CAPEX do mês'}
                className={`border-t border-bd/50 ${projetado ? 'text-muted' : 'cursor-pointer hover:bg-surface2/40'}`}
              >
                <td className="px-4 py-2 tabular-nums">
                  {rotuloMes(mes)}
                  {projetado ? <span className="ml-1 text-[10px] uppercase text-muted/70">est.</span> : null}
                </td>
                {dados.series.map((s) => {
                  const v = s.valores[i]
                  return (
                    <td key={s.id} className="px-4 py-2 text-right tabular-nums">
                      {v === null || v === undefined ? '—' : brl(v)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
