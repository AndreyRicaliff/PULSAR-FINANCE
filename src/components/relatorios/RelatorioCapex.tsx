/**
 * @file Relatório de CAPEX — investimento (expansão) × manutenção (reposição/conservação),
 * na base de CAIXA (baixas), com adesão vs orçamento quando o provedor produz orçamento.
 * A configuração é POR EMPRESA: nós marcados na Matriz de Classificações (menu de
 * contexto → CAPEX). Sem % sobre receita de propósito — misturaria base caixa com
 * competência; a composição é sobre o próprio CAPEX.
 */
import { useMemo } from 'react'
import { resumoCapex } from '@/core/capex'
import { ROTULO_CAPEX } from '@/core/modelo'
import { temOrcamento } from '@/core/provedor'
import { adesaoCapex, type AdesaoLado } from '@/lib/capexOrcado'
import { useClientes, useProvedor } from '@/lib/clientes'
import { brl } from '@/lib/money'
import { pctExecucao } from '@/lib/orcadoCategorias'
import { useOrcamento } from '@/lib/useOrcamento'
import { useResultado } from '@/lib/useResultado'
import { AnelExecucao } from '../charts/AnelExecucao.tsx'
import { BarrasCapexMensal } from '../charts/BarrasCapexMensal.tsx'
import { GraficoExpansivel } from '../charts/GraficoExpansivel.tsx'
import { KpiCard } from '../KpiCard.tsx'

export function RelatorioCapex() {
  const provedor = useProvedor()
  const { ativo } = useClientes()
  const { movimentos, conc, periodo } = useResultado()
  const orc = useOrcamento()

  const resumo = useMemo(() => resumoCapex(movimentos, conc), [movimentos, conc])
  const mesesAlvo = useMemo(() => {
    const ini = periodo.intervalo.inicio ? periodo.intervalo.inicio.slice(0, 7) : null
    const fim = periodo.intervalo.fim ? periodo.intervalo.fim.slice(0, 7) : null
    return Object.keys(orc.meses).filter((m) => (!ini || m >= ini) && (!fim || m <= fim))
  }, [orc.meses, periodo.intervalo])
  const adesao = useMemo(() => adesaoCapex(orc.meses, mesesAlvo, conc), [orc.meses, mesesAlvo, conc])

  const total = resumo.investimentoCentavos + resumo.manutencaoCentavos
  const porGrupo = useMemo(() => resumo.porNo.filter((n) => n.valorCentavos > 0), [resumo.porNo])
  const temAdesao =
    temOrcamento(ativo.provedor) &&
    (adesao.investimento.previstoCentavos > 0 || adesao.manutencao.previstoCentavos > 0)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-extrabold">CAPEX — Investimento × Manutenção</h2>
        <p className="text-sm text-muted">
          Base de <strong>caixa</strong> (baixas {provedor.de}) · configurável por empresa na Matriz de
          Classificações — botão direito num grupo/subgrupo → <strong>CAPEX</strong>
        </p>
      </header>

      {!resumo.temNoMarcado ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
          Nenhum grupo marcado como CAPEX nesta empresa ainda. Abra a Matriz de Classificações, clique
          com o botão direito no grupo/subgrupo (ex.: Aquisição de Imobilizado, Manutenção e
          Conservação) e escolha CAPEX → Investimento ou Manutenção. Estruturas criadas antes desta
          versão não recebem a marcação automática — é decisão da empresa, feita uma vez.
        </p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard rotulo="CAPEX no período (caixa)" valor={brl(total)} cor="primary" nota="Investimento + manutenção pagos" />
            <KpiCard
              rotulo="Investimento (expansão)"
              valor={brl(resumo.investimentoCentavos)}
              cor="accent"
              nota={total !== 0 ? `${Math.round((resumo.investimentoCentavos / total) * 100)}% do CAPEX` : 'Sem baixa no período'}
            />
            <KpiCard
              rotulo="Manutenção (reposição)"
              valor={brl(resumo.manutencaoCentavos)}
              cor="warn"
              nota={total !== 0 ? `${Math.round((resumo.manutencaoCentavos / total) * 100)}% do CAPEX` : 'Sem baixa no período'}
            />
          </section>

          {temAdesao ? (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CardAdesao rotulo="Adesão · Investimento" lado={adesao.investimento} cor="rgb(var(--c-accent))" />
              <CardAdesao rotulo="Adesão · Manutenção" lado={adesao.manutencao} cor="rgb(var(--c-warn))" />
            </section>
          ) : (
            <p className="rounded-card border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
              {temOrcamento(ativo.provedor)
                ? 'O orçamento do período não tem valores nas contas conciliadas como CAPEX — a adesão (orçado × realizado) fica sem base até o BPO orçar essas contas.'
                : `O ${provedor.nome} não expõe módulo de orçamento — este relatório mostra o realizado; a adesão orçado × realizado fica sem fonte para este cliente.`}
            </p>
          )}

          {total === 0 ? (
            <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
              Há grupos marcados como CAPEX, mas nenhuma baixa caiu neles no período selecionado.
            </p>
          ) : (
            <>
              <BarraComposicao investimento={resumo.investimentoCentavos} manutencao={resumo.manutencaoCentavos} />
              <GraficoExpansivel titulo="Evolução mensal · investimento × manutenção">
                <BarrasCapexMensal dados={resumo.porMes} />
              </GraficoExpansivel>
              {porGrupo.length > 0 ? <ComposicaoPorGrupo grupos={porGrupo} total={total} /> : null}
              <TabelaMensal porMes={resumo.porMes} />
            </>
          )}
        </>
      )}
    </div>
  )
}

/** Composição 100%: quanto do CAPEX veio de cada balde — valor + % em texto, cor como reforço. */
function BarraComposicao({ investimento, manutencao }: { investimento: number; manutencao: number }) {
  const invPos = Math.max(0, investimento)
  const manPos = Math.max(0, manutencao)
  const base = invPos + manPos
  if (base === 0) return null
  const pctInv = Math.round((invPos / base) * 100)
  return (
    <section className="flex flex-col gap-2 rounded-card border border-bd bg-surface p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">De onde vem o CAPEX</h3>
      <div className="flex h-4 overflow-hidden rounded-full bg-surface2" role="img" aria-label={`Investimento ${pctInv}%, manutenção ${100 - pctInv}%`}>
        {invPos > 0 ? <div className="h-full bg-accent" style={{ width: `${pctInv}%` }} /> : null}
        {manPos > 0 ? <div className="h-full bg-warn" style={{ width: `${100 - pctInv}%` }} /> : null}
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <span className="text-accent">
          Investimento: <strong className="tabular-nums">{brl(investimento)}</strong> · {pctInv}%
        </span>
        <span className="text-warn">
          Manutenção e reparos: <strong className="tabular-nums">{brl(manutencao)}</strong> · {100 - pctInv}%
        </span>
      </div>
    </section>
  )
}

/** Adesão no desenho da referência: anel de % do orçado + status em texto. Gastar ACIMA do
 * orçado em CAPEX é fora do plano (semântica de despesa) — o texto diz, a cor reforça. */
function CardAdesao({ rotulo, lado, cor }: { rotulo: string; lado: AdesaoLado; cor: string }) {
  const pct = pctExecucao(lado.realizadoCentavos, lado.previstoCentavos)
  const status =
    pct === null ? 'sem orçamento como base' : pct === 100 ? 'exato no orçado' : pct > 100 ? `${pct - 100}% acima do orçado` : `${100 - pct}% abaixo do orçado`
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-bd bg-surface p-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{rotulo} · % do orçado</h3>
        <p className="mt-1 text-xs text-muted">
          {brl(lado.realizadoCentavos)} realizados de {brl(lado.previstoCentavos)} orçados
        </p>
        <p className={`mt-1 text-xs font-semibold ${pct === null ? 'text-muted' : pct > 100 ? 'text-danger' : 'text-accent'}`}>{status}</p>
      </div>
      <AnelExecucao pct={pct} natureza="P" cor={cor} rotulo={`${rotulo}: % do orçado`} />
    </div>
  )
}

/** Composição no desenho da referência: barra LARGA por grupo (% do CAPEX total), cor pelo tipo. */
function ComposicaoPorGrupo({ grupos, total }: { grupos: readonly { nome: string; tipo: 'investimento' | 'manutencao'; valorCentavos: number }[]; total: number }) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-bd bg-surface p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Composição por grupo</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="py-1.5 pr-3 font-medium">Grupo</th>
            <th className="py-1.5 pr-3 font-medium">Tipo</th>
            <th className="py-1.5 pr-3 text-right font-medium">Valor (caixa)</th>
            <th className="w-[36%] py-1.5 font-medium">% do CAPEX</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => {
            const pct = total > 0 ? Math.round((g.valorCentavos / total) * 100) : 0
            const corBarra = g.tipo === 'investimento' ? 'bg-accent' : 'bg-warn'
            const corTexto = g.tipo === 'investimento' ? 'text-accent' : 'text-warn'
            return (
              <tr key={g.nome} className="border-t border-bd/50">
                <td className="max-w-0 truncate py-1.5 pr-3" title={g.nome}>
                  {g.nome}
                </td>
                <td className={`py-1.5 pr-3 text-xs ${corTexto}`}>{ROTULO_CAPEX[g.tipo]}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{brl(g.valorCentavos)}</td>
                <td className="py-1.5">
                  <div className="flex min-w-[9rem] items-center gap-2" title={`${brl(g.valorCentavos)} de ${brl(total)} (${pct}%)`}>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface2">
                      <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">{pct}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`

function TabelaMensal({ porMes }: { porMes: readonly { mes: string; investimentoCentavos: number; manutencaoCentavos: number }[] }) {
  if (porMes.length === 0) return null
  return (
    <div className="max-h-[28rem] overflow-auto rounded-card border border-bd">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Mês</th>
            <th className="px-4 py-2 text-right font-medium">Investimento</th>
            <th className="px-4 py-2 text-right font-medium">Manutenção</th>
            <th className="px-4 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {porMes.map((l) => (
            <tr key={l.mes} className="border-t border-bd/50">
              <td className="px-4 py-2 tabular-nums">{rotuloMes(l.mes)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-accent">{l.investimentoCentavos !== 0 ? brl(l.investimentoCentavos) : '—'}</td>
              <td className="px-4 py-2 text-right tabular-nums text-warn">{l.manutencaoCentavos !== 0 ? brl(l.manutencaoCentavos) : '—'}</td>
              <td className="px-4 py-2 text-right font-semibold tabular-nums">{brl(l.investimentoCentavos + l.manutencaoCentavos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
