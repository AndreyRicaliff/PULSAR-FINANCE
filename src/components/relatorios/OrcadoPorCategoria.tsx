/**
 * @file Orçado × Atual por categoria: anel de execução + tabela com barra de % do orçado.
 * Cor identifica a NATUREZA (entrada/saída, como nas demais colunas do app); o status
 * (dentro/fora do orçado) vai em texto e no ponto — receita acima do orçado é bom,
 * despesa acima é ruim. Fonte: doc de orçamento (só Omie) — quem renderiza decide esconder.
 */
import { dentroDoOrcado, pctExecucao, type LinhaCategoria, type OrcadoPorLado } from '@/lib/orcadoCategorias'
import { brl } from '@/lib/money'
import { AnelExecucao } from '../charts/AnelExecucao.tsx'

interface Props {
  readonly receitas: OrcadoPorLado
  readonly despesas: OrcadoPorLado
  readonly nomeDe: (codigo: string) => string
  /** Ex.: 'ano 2026' ou '01/26' — aparece no subtítulo dos dois cards. */
  readonly rotuloRecorte: string
}

export function OrcadoPorCategoria({ receitas, despesas, nomeDe, rotuloRecorte }: Props) {
  if (receitas.linhas.length === 0 && despesas.linhas.length === 0) return null
  return (
    <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <CardLado titulo="Receitas" natureza="R" lado={receitas} nomeDe={nomeDe} rotuloRecorte={rotuloRecorte} />
      <CardLado titulo="Despesas" natureza="P" lado={despesas} nomeDe={nomeDe} rotuloRecorte={rotuloRecorte} />
    </section>
  )
}

interface PropsLado {
  readonly titulo: string
  readonly natureza: 'R' | 'P'
  readonly lado: OrcadoPorLado
  readonly nomeDe: (codigo: string) => string
  readonly rotuloRecorte: string
}

function CardLado({ titulo, natureza, lado, nomeDe, rotuloRecorte }: PropsLado) {
  const pctTotal = pctExecucao(lado.realizadoCentavos, lado.previstoCentavos)
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-card border border-bd bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo} · Orçado × Atual</h3>
          <p className="text-xs text-muted">{rotuloRecorte} · Atual = baixas do orçamento de caixa</p>
          <StatusOrcado natureza={natureza} pct={pctTotal} />
        </div>
        <AnelExecucao pct={pctTotal} natureza={natureza} rotulo={`${titulo}: % do orçado`} />
      </header>
      {lado.linhas.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-6 text-center text-sm text-muted">
          Sem {titulo.toLowerCase()} no orçamento deste recorte.
        </p>
      ) : (
        <TabelaLado natureza={natureza} lado={lado} nomeDe={nomeDe} />
      )}
    </div>
  )
}

/** Status em TEXTO (cor nunca sozinha): 'no orçado' / 'acima do orçado' / 'abaixo do orçado'. */
function StatusOrcado({ natureza, pct }: { natureza: 'R' | 'P'; pct: number | null }) {
  if (pct === null) return <p className="mt-1 text-xs text-muted">Sem orçamento como base neste recorte.</p>
  const bom = dentroDoOrcado(natureza, pct)
  const rotulo = pct === 100 ? 'exato no orçado' : pct > 100 ? `${pct - 100}% acima do orçado` : `${100 - pct}% abaixo do orçado`
  return <p className={`mt-1 text-xs font-semibold ${bom ? 'text-accent' : 'text-danger'}`}>{rotulo}</p>
}

function TabelaLado({ natureza, lado, nomeDe }: { natureza: 'R' | 'P'; lado: OrcadoPorLado; nomeDe: (codigo: string) => string }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="py-1.5 pr-3 font-medium">Categoria</th>
            <th className="py-1.5 pr-3 text-right font-medium">Atual</th>
            <th className="py-1.5 pr-3 text-right font-medium">Orçado</th>
            <th className="py-1.5 pr-3 text-right font-medium">Diferença</th>
            <th className="w-[30%] py-1.5 font-medium">% do orçado</th>
          </tr>
        </thead>
        <tbody>
          {lado.linhas.map((l) => (
            <LinhaTabela key={l.codigo} natureza={natureza} linha={l} nome={nomeDe(l.codigo)} />
          ))}
        </tbody>
        <tfoot>
          <TotalTabela natureza={natureza} lado={lado} />
        </tfoot>
      </table>
    </div>
  )
}

function LinhaTabela({ natureza, linha, nome }: { natureza: 'R' | 'P'; linha: LinhaCategoria; nome: string }) {
  const dif = linha.realizadoCentavos - linha.previstoCentavos
  const pct = pctExecucao(linha.realizadoCentavos, linha.previstoCentavos)
  return (
    <tr className="border-t border-bd/50">
      <td className="max-w-0 truncate py-1.5 pr-3" title={nome}>
        {nome}
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums">{brl(linha.realizadoCentavos)}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums text-muted">
        {linha.previstoCentavos !== 0 ? brl(linha.previstoCentavos) : '—'}
      </td>
      <td className={`py-1.5 pr-3 text-right tabular-nums ${dif >= 0 ? 'text-accent' : 'text-danger'}`}>
        {dif !== 0 ? brl(dif) : '—'}
      </td>
      <td className="py-1.5">
        <BarraPct natureza={natureza} pct={pct} />
      </td>
    </tr>
  )
}

function TotalTabela({ natureza, lado }: { natureza: 'R' | 'P'; lado: OrcadoPorLado }) {
  const dif = lado.realizadoCentavos - lado.previstoCentavos
  const pct = pctExecucao(lado.realizadoCentavos, lado.previstoCentavos)
  return (
    <tr className="border-t-2 border-bd font-semibold">
      <td className="py-2 pr-3">Total</td>
      <td className="py-2 pr-3 text-right tabular-nums">{brl(lado.realizadoCentavos)}</td>
      <td className="py-2 pr-3 text-right tabular-nums text-muted">{brl(lado.previstoCentavos)}</td>
      <td className={`py-2 pr-3 text-right tabular-nums ${dif >= 0 ? 'text-accent' : 'text-danger'}`}>{brl(dif)}</td>
      <td className="py-2">
        <BarraPct natureza={natureza} pct={pct} />
      </td>
    </tr>
  )
}

/** Barra fina com trilho: preenche até 100% (o número diz o excesso) + ponto de status com texto acessível. */
function BarraPct({ natureza, pct }: { natureza: 'R' | 'P'; pct: number | null }) {
  const bom = dentroDoOrcado(natureza, pct)
  const corBarra = natureza === 'R' ? 'bg-accent' : 'bg-danger'
  const corPonto = bom ? 'bg-accent' : 'bg-danger'
  const statusTexto = bom === null ? 'sem base de orçado' : bom ? 'dentro do orçado' : 'fora do orçado'
  return (
    <div className="flex min-w-[8rem] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
        {pct !== null ? (
          <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
        ) : null}
      </div>
      <span className="w-11 shrink-0 text-right text-xs tabular-nums text-muted">{pct === null ? '—' : `${pct}%`}</span>
      {bom === null ? (
        <span className="h-2 w-2 shrink-0" aria-hidden />
      ) : (
        <span className={`h-2 w-2 shrink-0 rounded-full ${corPonto}`} title={statusTexto}>
          <span className="sr-only">{statusTexto}</span>
        </span>
      )}
    </div>
  )
}
