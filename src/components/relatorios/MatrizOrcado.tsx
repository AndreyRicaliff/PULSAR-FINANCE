/**
 * @file Matriz mensal estilo DRE gerencial (referência do coordenador, 02/08): contas nas
 * linhas, MESES nas colunas — cada mês com Planejado | Realizado | Variação($) | Variação(%),
 * ligáveis pelo "Exibir colunas". Primeira coluna fixa (sticky) + scroll horizontal.
 * Cor da variação é SEMÂNTICA por lado (receita acima do plano = bom; despesa acima = ruim),
 * não pelo sinal cru — diferente da referência, fiel ao vocabulário do app.
 */
import { useMemo, useState } from 'react'
import { brl, pctVariacao } from '@/lib/money'
import type { LinhaMatriz, MatrizOrcado as Dados } from '@/lib/orcadoCategorias'

type Coluna = 'previsto' | 'realizado' | 'varAbs' | 'varPct'

const COLUNAS: readonly { id: Coluna; rotulo: string; cab: string }[] = [
  { id: 'previsto', rotulo: 'Planejado', cab: 'Plan.' },
  { id: 'realizado', rotulo: 'Realizado', cab: 'Real.' },
  { id: 'varAbs', rotulo: 'Variação ($)', cab: 'Var ($)' },
  { id: 'varPct', rotulo: 'Variação (%)', cab: 'Var (%)' },
]

const rotuloMes = (mes: string): string => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`

export function MatrizOrcado({ dados, nomeDe }: { dados: Dados; nomeDe: (codigo: string) => string }) {
  const [visiveis, setVisiveis] = useState<ReadonlySet<Coluna>>(new Set<Coluna>(['previsto', 'realizado', 'varAbs', 'varPct']))
  const colunas = COLUNAS.filter((c) => visiveis.has(c.id))
  const totalReceitas = useMemo(() => totalizar(dados.receitas, dados.meses), [dados])
  const totalDespesas = useMemo(() => totalizar(dados.despesas, dados.meses), [dados])
  if (dados.meses.length === 0 || (dados.receitas.length === 0 && dados.despesas.length === 0)) return null

  const alternar = (id: Coluna) =>
    setVisiveis((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n.size === 0 ? s : n // nunca zero colunas — a matriz sem métrica não diz nada
    })

  return (
    <section className="flex flex-col gap-3 rounded-card border border-bd bg-surface p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Matriz mensal · Planejado × Realizado</h3>
          <p className="text-xs text-muted">Contas nas linhas, meses nas colunas — fonte: orçamento de caixa</p>
        </div>
        <fieldset className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <legend className="sr-only">Exibir colunas</legend>
          <span className="uppercase tracking-wide">Exibir:</span>
          {COLUNAS.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={visiveis.has(c.id)} onChange={() => alternar(c.id)} className="accent-[rgb(var(--c-primary))]" />
              {c.rotulo}
            </label>
          ))}
        </fieldset>
      </header>

      <div className="max-h-[36rem] overflow-auto rounded-card border border-bd">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-20 bg-surface2 text-left uppercase tracking-wide text-muted">
            <tr>
              <th className="sticky left-0 z-30 bg-surface2 px-3 py-2 font-medium">Estrutura</th>
              {dados.meses.map((m) => (
                <th key={m} colSpan={colunas.length} className="border-l border-bd/60 px-3 py-1.5 text-center font-semibold tabular-nums">
                  {rotuloMes(m)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-30 bg-surface2 px-3 py-1" />
              {dados.meses.flatMap((m) =>
                colunas.map((c, ci) => (
                  <th key={`${m}-${c.id}`} className={`px-3 py-1 text-right font-medium ${ci === 0 ? 'border-l border-bd/60' : ''}`}>
                    {c.cab}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            <LinhaSecao rotulo="Receitas" nCols={1 + dados.meses.length * colunas.length} />
            {dados.receitas.map((l) => (
              <Linha key={l.codigo} natureza="R" linha={l} meses={dados.meses} colunas={colunas} nome={nomeDe(l.codigo)} />
            ))}
            <LinhaTotal natureza="R" rotulo="(=) Total Receitas" porMes={totalReceitas} meses={dados.meses} colunas={colunas} />
            <LinhaSecao rotulo="Despesas" nCols={1 + dados.meses.length * colunas.length} />
            {dados.despesas.map((l) => (
              <Linha key={l.codigo} natureza="P" linha={l} meses={dados.meses} colunas={colunas} nome={nomeDe(l.codigo)} />
            ))}
            <LinhaTotal natureza="P" rotulo="(=) Total Despesas" porMes={totalDespesas} meses={dados.meses} colunas={colunas} />
            <LinhaResultado receitas={totalReceitas} despesas={totalDespesas} meses={dados.meses} colunas={colunas} />
          </tbody>
        </table>
      </div>
    </section>
  )
}

interface TotMes {
  previsto: number
  realizado: number
}

function totalizar(linhas: readonly LinhaMatriz[], meses: readonly string[]): ReadonlyMap<string, TotMes> {
  const tot = new Map<string, TotMes>()
  for (const mes of meses) {
    const a = { previsto: 0, realizado: 0 }
    for (const l of linhas) {
      const v = l.porMes.get(mes)
      if (!v) continue
      a.previsto += v.previstoCentavos
      a.realizado += v.realizadoCentavos
    }
    tot.set(mes, a)
  }
  return tot
}

/** Variação semântica: receita acima do plano é bom; despesa acima é ruim. */
function corVar(natureza: 'R' | 'P', varAbs: number): string {
  if (varAbs === 0) return 'text-muted'
  const bom = natureza === 'R' ? varAbs > 0 : varAbs < 0
  return bom ? 'text-accent' : 'text-danger'
}

function Celulas({
  natureza,
  previsto,
  realizado,
  colunas,
}: {
  natureza: 'R' | 'P'
  previsto: number
  realizado: number
  colunas: readonly { id: Coluna }[]
}) {
  const varAbs = realizado - previsto
  const delta = previsto !== 0 ? varAbs / Math.abs(previsto) : null
  const vazio = previsto === 0 && realizado === 0
  const valorDe: Record<Coluna, string> = {
    previsto: previsto !== 0 ? brl(previsto) : '—',
    realizado: realizado !== 0 ? brl(realizado) : '—',
    varAbs: vazio ? '—' : brl(varAbs),
    varPct: pctVariacao(delta),
  }
  const classeDe: Record<Coluna, string> = {
    previsto: 'text-muted',
    realizado: '',
    varAbs: vazio ? 'text-muted' : corVar(natureza, varAbs),
    varPct: vazio ? 'text-muted' : corVar(natureza, varAbs),
  }
  return (
    <>
      {colunas.map((c, ci) => (
        <td key={c.id} className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${classeDe[c.id]} ${ci === 0 ? 'border-l border-bd/40' : ''}`}>
          {valorDe[c.id]}
        </td>
      ))}
    </>
  )
}

function Linha({
  natureza,
  linha,
  meses,
  colunas,
  nome,
}: {
  natureza: 'R' | 'P'
  linha: LinhaMatriz
  meses: readonly string[]
  colunas: readonly { id: Coluna }[]
  nome: string
}) {
  return (
    <tr className="border-t border-bd/40 hover:bg-surface2/40">
      <td className="sticky left-0 z-10 max-w-[16rem] truncate bg-surface px-3 py-1.5" title={nome}>
        {nome}
      </td>
      {meses.map((m) => {
        const v = linha.porMes.get(m)
        return <Celulas key={m} natureza={natureza} previsto={v?.previstoCentavos ?? 0} realizado={v?.realizadoCentavos ?? 0} colunas={colunas} />
      })}
    </tr>
  )
}

function LinhaTotal({
  natureza,
  rotulo,
  porMes,
  meses,
  colunas,
}: {
  natureza: 'R' | 'P'
  rotulo: string
  porMes: ReadonlyMap<string, TotMes>
  meses: readonly string[]
  colunas: readonly { id: Coluna }[]
}) {
  return (
    <tr className="border-t-2 border-bd bg-surface2/50 font-semibold">
      <td className="sticky left-0 z-10 bg-surface2 px-3 py-1.5">{rotulo}</td>
      {meses.map((m) => {
        const t = porMes.get(m) ?? { previsto: 0, realizado: 0 }
        return <Celulas key={m} natureza={natureza} previsto={t.previsto} realizado={t.realizado} colunas={colunas} />
      })}
    </tr>
  )
}

/** Resultado = receitas − despesas; aqui a cor É pelo sinal (saldo positivo bom). */
function LinhaResultado({
  receitas,
  despesas,
  meses,
  colunas,
}: {
  receitas: ReadonlyMap<string, TotMes>
  despesas: ReadonlyMap<string, TotMes>
  meses: readonly string[]
  colunas: readonly { id: Coluna }[]
}) {
  return (
    <tr className="border-t-2 border-bd bg-surface2 font-bold">
      <td className="sticky left-0 z-10 bg-surface2 px-3 py-2">(=) Resultado</td>
      {meses.map((m) => {
        const r = receitas.get(m) ?? { previsto: 0, realizado: 0 }
        const d = despesas.get(m) ?? { previsto: 0, realizado: 0 }
        return <Celulas key={m} natureza="R" previsto={r.previsto - d.previsto} realizado={r.realizado - d.realizado} colunas={colunas} />
      })}
    </tr>
  )
}

function LinhaSecao({ rotulo, nCols }: { rotulo: string; nCols: number }) {
  return (
    <tr className="border-t border-bd/60 bg-surface2/70">
      <td colSpan={nCols} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {rotulo}
      </td>
    </tr>
  )
}
