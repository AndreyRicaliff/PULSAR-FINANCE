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
import { Donut } from '../charts/Donut.tsx'
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
  const fatias = useMemo(
    () =>
      resumo.porNo
        .filter((n) => n.valorCentavos > 0)
        .map((n) => ({ label: `${n.nome} · ${ROTULO_CAPEX[n.tipo]}`, valorCentavos: n.valorCentavos })),
    [resumo.porNo],
  )
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
              <CardAdesao rotulo="Adesão · Investimento" lado={adesao.investimento} />
              <CardAdesao rotulo="Adesão · Manutenção" lado={adesao.manutencao} />
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
              {fatias.length > 0 ? (
                <GraficoExpansivel titulo="Composição do CAPEX por grupo">
                  <Donut fatias={fatias} />
                </GraficoExpansivel>
              ) : null}
              <TabelaMensal porMes={resumo.porMes} />
            </>
          )}
        </>
      )}
    </div>
  )
}

function CardAdesao({ rotulo, lado }: { rotulo: string; lado: AdesaoLado }) {
  const pct = pctExecucao(lado.realizadoCentavos, lado.previstoCentavos)
  return (
    <KpiCard
      rotulo={rotulo}
      valor={pct === null ? '—' : `${pct}%`}
      cor={pct === null ? 'secondary' : pct <= 100 ? 'accent' : 'danger'}
      nota={`${brl(lado.realizadoCentavos)} realizados de ${brl(lado.previstoCentavos)} orçados`}
    />
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
