/**
 * @file Previsto × Realizado mensal — três colunas honestas, cada uma com sua fonte:
 * Previsto (orçamento de caixa do ERP), Realizável (títulos em aberto por vencimento,
 * compromisso contratado) e Realizado (baixas do ERP, auditável 1:1 contra ele).
 *
 * Previsto e Realizado saem do doc de orçamento — que só o Omie produz. Para provedor sem
 * módulo de orçamento (Nibo) as duas colunas ficam vazias por FALTA DE FONTE, não por bug:
 * a tela diz isso em vez de repetir a copy do Omie.
 */
import { useMemo } from 'react'
import type { Movimento } from '@/core/movimento'
import { isoDeMov } from '@/core/periodo'
import { temOrcamento, type RotulosProvedor } from '@/core/provedor'
import { useClientes, useProvedor } from '@/lib/clientes'
import { dataHora } from '@/lib/datas'
import { brl, pctVariacao } from '@/lib/money'
import { useMovimentos } from '@/lib/movimentos'
import { useOrcamento, type LinhaOrcamento } from '@/lib/useOrcamento'
import { KpiCard } from '../KpiCard.tsx'

interface LinhaMes {
  readonly mes: string // 'aaaa-mm'
  readonly rotulo: string // 'mm/aa'
  readonly previsto: Saldo
  readonly realizavel: Saldo
  readonly realizado: Saldo
}

interface Saldo {
  readonly entrada: number
  readonly saida: number
}

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`
const ANO_ATUAL = '2026'

export function RelatorioPrevistoRealizado() {
  const provedor = useProvedor()
  const { ativo } = useClientes()
  const orcamentoNaFonte = temOrcamento(ativo.provedor)
  const orc = useOrcamento()
  const { movimentos } = useMovimentos()

  const linhas = useMemo(() => montarLinhas(orc.meses, movimentos), [orc.meses, movimentos])
  const doAno = linhas.filter((l) => l.mes.startsWith(ANO_ATUAL))
  const temOrc = linhas.some((l) => l.previsto.entrada !== 0 || l.previsto.saida !== 0)
  const temRealizado = linhas.some((l) => l.realizado.entrada !== 0 || l.realizado.saida !== 0)

  const totalPrev = soma(doAno.map((l) => l.previsto))
  const totalReal = soma(doAno.map((l) => l.realizado))
  const totalRzv = soma(doAno.map((l) => l.realizavel))

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[19px] font-semibold">Previsto × Realizado</h1>
        <p className="text-sm text-muted">
          <strong>Previsto</strong> = orçamento de caixa {provedor.de} · <strong>Realizável</strong> = títulos
          em aberto pelo vencimento (compromisso contratado) · <strong>Realizado</strong> = baixas
          efetivas {provedor.de} (auditável contra o ERP)
        </p>
        {orc.geradoEm ? (
          <p className="mt-1 text-xs text-muted">
            Orçamento {provedor.nome} atualizado em {dataHora(orc.geradoEm)} · cada sincronização varre o ano
            corrente inteiro (conclui ~5 min após o sync)
          </p>
        ) : null}
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo={`Previsto ${ANO_ATUAL} (saldo)`} valor={brl(totalPrev.entrada - totalPrev.saida)} cor="warn" nota={notaPrevisto(orcamentoNaFonte, temOrc, provedor)} />
        <KpiCard rotulo={`Realizável (em aberto)`} valor={brl(totalRzv.entrada - totalRzv.saida)} cor="secondary" nota="Títulos em aberto, por vencimento" />
        <KpiCard rotulo={`Realizado ${ANO_ATUAL} (saldo)`} valor={brl(totalReal.entrada - totalReal.saida)} cor={totalReal.entrada - totalReal.saida >= 0 ? 'accent' : 'danger'} nota={`Baixas ${provedor.nome}, regime caixa`} />
      </section>

      {!orcamentoNaFonte ? (
        <p className="rounded-card border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          O {provedor.nome} não expõe módulo de orçamento, então <strong>Previsto</strong> e{' '}
          <strong>Realizado por baixa</strong> ficam sem fonte para este cliente — só{' '}
          <strong>Realizável</strong> (títulos em aberto) é dado real aqui. O caixa realizado deste
          cliente está no relatório de <strong>Fluxo de Caixa (DFC)</strong>.
        </p>
      ) : !temOrc ? (
        <p className="rounded-card border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          O módulo de orçamento {provedor.de} está vazio — a coluna Previsto fica zerada até o BPO
          preenchê-lo (ou até existir orçamento próprio no Pulsar Finance). Realizável e Realizado
          já são dados reais.
        </p>
      ) : null}
      {orcamentoNaFonte && !temRealizado ? (
        <p className="rounded-card border border-dashed border-bd p-6 text-center text-muted">
          Sem dados de orçamento sincronizados ainda — rode a sincronização para popular o
          realizado por baixas.
        </p>
      ) : null}

      <Tabela linhas={linhas} />
    </div>
  )
}

function notaPrevisto(naFonte: boolean, preenchido: boolean, p: RotulosProvedor): string {
  if (!naFonte) return `${p.nome} não tem módulo de orçamento`
  return preenchido ? `Orçamento de caixa ${p.nome}` : `Orçamento não preenchido ${p.em}`
}

function montarLinhas(
  meses: Readonly<Record<string, readonly LinhaOrcamento[]>>,
  movimentos: readonly Movimento[],
): LinhaMes[] {
  const porMes = new Map<string, { previsto: SaldoMut; realizado: SaldoMut; realizavel: SaldoMut }>()
  const entrada = (mes: string) => {
    const m = porMes.get(mes) ?? { previsto: { entrada: 0, saida: 0 }, realizado: { entrada: 0, saida: 0 }, realizavel: { entrada: 0, saida: 0 } }
    porMes.set(mes, m)
    return m
  }
  for (const [mes, folhas] of Object.entries(meses)) {
    const alvo = entrada(mes)
    for (const f of folhas) {
      // Natureza pelo prefixo do plano Omie: 1 = receita, 2 = despesa (0/transferência fora).
      // Só o Omie chega aqui (é o único que produz orçamento), então o código é hierárquico.
      const lado = f.categoria.startsWith('1') ? 'entrada' : f.categoria.startsWith('2') ? 'saida' : null
      if (!lado) continue
      alvo.previsto[lado] += f.previstoCentavos
      alvo.realizado[lado] += f.realizadoCentavos
    }
  }
  // Realizável: títulos em aberto pelo mês de vencimento (ou previsão).
  for (const m of movimentos) {
    if ((m.valorAbertoCentavos ?? 0) <= 0) continue
    const iso = isoDeMov(m.dataVencimento || m.dataPrevisao || '')
    if (!iso) continue
    const lado = m.natureza.toUpperCase() === 'R' ? 'entrada' : 'saida'
    entrada(iso.slice(0, 7)).realizavel[lado] += m.valorAbertoCentavos
  }
  return [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, rotulo: rotuloMes(mes), ...v }))
}

interface SaldoMut {
  entrada: number
  saida: number
}

function soma(saldos: readonly Saldo[]): Saldo {
  return saldos.reduce((a, s) => ({ entrada: a.entrada + s.entrada, saida: a.saida + s.saida }), { entrada: 0, saida: 0 })
}

function Tabela({ linhas }: { linhas: readonly LinhaMes[] }) {
  if (linhas.length === 0) return null
  return (
    <div className="max-h-[34rem] overflow-auto rounded-card border border-bd">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Mês</th>
            <th className="px-4 py-2 text-right font-medium">Previsto (saldo)</th>
            <th className="px-4 py-2 text-right font-medium">Realizável (saldo)</th>
            <th className="px-4 py-2 text-right font-medium">Realizado entradas</th>
            <th className="px-4 py-2 text-right font-medium">Realizado saídas</th>
            <th className="px-4 py-2 text-right font-medium">Realizado (saldo)</th>
            <th className="px-4 py-2 text-right font-medium">Δ vs previsto</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const prev = l.previsto.entrada - l.previsto.saida
            const real = l.realizado.entrada - l.realizado.saida
            const rzv = l.realizavel.entrada - l.realizavel.saida
            const delta = prev !== 0 ? (real - prev) / Math.abs(prev) : null
            return (
              <tr key={l.mes} className="border-t border-bd/50">
                <td className="px-4 py-2 tabular-nums">{l.rotulo}</td>
                <td className="px-4 py-2 text-right tabular-nums text-muted">{prev !== 0 ? brl(prev) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-secondary">{rzv !== 0 ? brl(rzv) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-accent">{l.realizado.entrada !== 0 ? brl(l.realizado.entrada) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-danger">{l.realizado.saida !== 0 ? brl(l.realizado.saida) : '—'}</td>
                <td className={`px-4 py-2 text-right font-semibold tabular-nums ${real >= 0 ? 'text-accent' : 'text-danger'}`}>{real !== 0 ? brl(real) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-muted">{pctVariacao(delta)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
