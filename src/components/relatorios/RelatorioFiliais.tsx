/**
 * @file Resultado por Filial / Centro de Custo — receitas e despesas SEPARADAS por filial.
 * Fonte: dimensão centros da Matriz de Classificações (de-para contraparte→filial, com
 * precedência do departamento real Omie quando existir). Sem rateio por estimativa: o que
 * não tem dono fica explícito em "Sem filial".
 */
import { useMemo } from 'react'
import { resultadoPorFilial, type FiltroFilial, type LinhaFilial } from '@/core/filial'
import { useCadastros } from '@/lib/cadastros'
import { brl } from '@/lib/money'
import { usePeriodo } from '@/lib/periodo'
import { useModelo } from '@/lib/useModelo'
import { useResultado } from '@/lib/useResultado'
import { KpiCard } from '../KpiCard.tsx'

export function RelatorioFiliais() {
  const { movimentos } = useResultado()
  const { modelo } = useModelo()
  const { nomesContrapartes } = useCadastros()
  const r = useMemo(
    () => resultadoPorFilial(movimentos, modelo.centros, nomesContrapartes),
    [movimentos, modelo.centros, nomesContrapartes],
  )
  const atribuidos = movimentos.length - r.semFilial.qtd

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-extrabold">Resultado por Filial / Centro de Custo</h2>
        <p className="text-sm text-muted">
          Receitas e despesas separadas por filial · rateio da Omie entra sozinho no sync; o resto
          herda automaticamente a filial da contraparte (marque 1 movimento e os irmãos seguem) —
          tudo editável por movimento no detalhamento
        </p>
      </header>

      <Kpis linhas={r.linhas} />
      <Cobertura atribuidos={atribuidos} total={movimentos.length} semFilial={r.semFilial} />

      {r.linhas.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
          Nenhum movimento atribuído a filial ainda. O rateio feito na Omie entra sozinho a cada
          sync; para o restante, abra qualquer detalhamento de movimentos (Valores, Fornecedores ou
          "Ver movimentos") e use a coluna "Filial / C. Custo".
        </p>
      ) : (
        <Tabela linhas={r.linhas} semFilial={r.semFilial} />
      )}
      <p className="text-[11px] text-muted">
        Clique numa filial para filtrar TODOS os relatórios por ela (clique de novo para voltar a
        todas) — o seletor "Filial" da barra acima mostra o filtro ativo.
      </p>
    </div>
  )
}

function Kpis({ linhas }: { linhas: readonly LinhaFilial[] }) {
  const maiorReceita = [...linhas].sort((a, b) => b.entradasCentavos - a.entradasCentavos)[0]
  const maiorDespesa = [...linhas].sort((a, b) => b.saidasCentavos - a.saidasCentavos)[0]
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard rotulo="Filiais com movimento" valor={linhas.length} cor="primary" />
      <KpiCard
        rotulo="Maior receita"
        valor={maiorReceita && maiorReceita.entradasCentavos > 0 ? brl(maiorReceita.entradasCentavos) : '—'}
        nota={maiorReceita?.entradasCentavos ? maiorReceita.nome : undefined}
        cor="accent"
      />
      <KpiCard
        rotulo="Maior despesa"
        valor={maiorDespesa && maiorDespesa.saidasCentavos > 0 ? brl(-maiorDespesa.saidasCentavos) : '—'}
        nota={maiorDespesa?.saidasCentavos ? maiorDespesa.nome : undefined}
        cor="danger"
      />
    </section>
  )
}

function Cobertura({ atribuidos, total, semFilial }: { atribuidos: number; total: number; semFilial: LinhaFilial }) {
  if (total === 0) return null
  const pct = Math.round((atribuidos / total) * 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-muted">
        <span>Cobertura de atribuição a filiais</span>
        <span className="tabular-nums">
          {pct}% · {semFilial.qtd} mov. sem filial ({brl(semFilial.entradasCentavos - semFilial.saidasCentavos)})
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Tabela({ linhas, semFilial }: { linhas: readonly LinhaFilial[]; semFilial: LinhaFilial }) {
  const { filial, definirFilial } = usePeriodo()
  const alternar = (noId: FiltroFilial) => definirFilial(filial === noId ? null : noId)
  return (
    <div className="overflow-hidden rounded-card border border-bd bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface2/60 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2.5">Filial / Centro de Custo</th>
            <th className="px-4 py-2.5 text-right">Receitas</th>
            <th className="px-4 py-2.5 text-right">Despesas</th>
            <th className="px-4 py-2.5 text-right">Resultado</th>
            <th className="px-4 py-2.5 text-right">Mov.</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <Linha key={l.noId} l={l} ativa={filial === l.noId} onClick={() => alternar(l.noId)} />
          ))}
          {semFilial.qtd > 0 ? (
            <Linha l={semFilial} apagada ativa={filial === semFilial.noId} onClick={() => alternar(semFilial.noId)} />
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function Linha({ l, apagada, ativa, onClick }: { l: LinhaFilial; apagada?: boolean; ativa: boolean; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      title={ativa ? 'Clique para voltar a todas as filiais' : 'Clique para filtrar todos os relatórios por esta filial'}
      className={`cursor-pointer border-b border-bd/50 last:border-0 hover:bg-surface2/40 ${apagada ? 'text-muted' : ''} ${
        ativa ? 'bg-primary/10' : ''
      }`}
    >
      <td className="px-4 py-2.5 font-medium">
        {ativa ? <span className="mr-1.5 text-xs text-secondary">◉</span> : null}
        {l.nome}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-accent">{l.entradasCentavos ? brl(l.entradasCentavos) : '—'}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-danger">{l.saidasCentavos ? brl(-l.saidasCentavos) : '—'}</td>
      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${l.resultadoCentavos >= 0 ? 'text-accent' : 'text-danger'}`}>
        {brl(l.resultadoCentavos)}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-muted">{l.qtd}</td>
    </tr>
  )
}
