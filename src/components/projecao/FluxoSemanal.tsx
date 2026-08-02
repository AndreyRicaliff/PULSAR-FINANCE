/** @file Matriz Fluxo de Caixa Previsto × Realizado: linhas = estrutura, colunas = semanas (drill dia). */
import { useState } from 'react'
import type { No } from '@/core/modelo'
import {
  fluxoNoPeriodo,
  liquidoPrevisto,
  liquidoRealizado,
  type Fluxo,
  type Semana,
} from '@/core/projecao-semanal'
import { A_CONCILIAR } from '@/core/projecao'
import { brl } from '@/lib/money'
import { AnelExecucao } from '../charts/AnelExecucao.tsx'
import { Segmento, type OpcaoSeg } from '../Segmento.tsx'

interface Props {
  readonly semanas: readonly Semana[]
  readonly estrutura: readonly No[]
  readonly fluxo: ReadonlyMap<string, ReadonlyMap<string, Fluxo>>
  readonly saldoInicial: number
}

interface Coluna {
  readonly id: string
  readonly rotulo: string
  readonly dias: readonly string[]
  readonly semana?: Semana
  readonly dia?: boolean
  /** No 1º dia de uma semana expandida: id da semana para recolher de volta. */
  readonly recolherSemanaId?: string
}

const FZERO: Fluxo = { prevEntrada: 0, prevSaida: 0, realEntrada: 0, realSaida: 0 }
const somaFluxo = (a: Fluxo, b: Fluxo): Fluxo => ({
  prevEntrada: a.prevEntrada + b.prevEntrada,
  prevSaida: a.prevSaida + b.prevSaida,
  realEntrada: a.realEntrada + b.realEntrada,
  realSaida: a.realSaida + b.realSaida,
})

type VistaFluxo = 'visual' | 'matriz'
const VISTAS_FLUXO: readonly OpcaoSeg<VistaFluxo>[] = [
  { id: 'visual', rotulo: 'Resumo visual' },
  { id: 'matriz', rotulo: 'Matriz semanal' },
]

export function FluxoSemanal({ semanas, estrutura, fluxo, saldoInicial }: Props) {
  const [vista, setVista] = useState<VistaFluxo>('visual')
  const [semExpandida, setSemExpandida] = useState<ReadonlySet<string>>(new Set())
  const [grupoAberto, setGrupoAberto] = useState<ReadonlySet<string>>(new Set())

  const raiz = estrutura.filter((n) => !n.paiId)
  const subsDe = (id: string) => estrutura.filter((n) => n.paiId === id)
  const todosDias = semanas.flatMap((s) => s.dias.map((d) => d.iso))

  const colunas: Coluna[] = semanas.flatMap((s): Coluna[] => {
    if (!semExpandida.has(s.id)) return [{ id: s.id, rotulo: s.rotulo, dias: s.dias.map((d) => d.iso), semana: s }]
    return s.dias.map((d, i) => ({ id: d.iso, rotulo: d.rotulo, dias: [d.iso], dia: true, recolherSemanaId: i === 0 ? s.id : undefined }))
  })
  colunas.push({ id: 'total', rotulo: 'Mês', dias: todosDias })

  // Fluxo agregado de um conjunto de nós sobre os dias da coluna.
  const agg = (ids: readonly string[], dias: readonly string[]): Fluxo =>
    ids.reduce((acc, id) => somaFluxo(acc, fluxoNoPeriodo(fluxo.get(id), dias)), FZERO)

  const idsDoGrupo = (g: No): string[] => [g.id, ...subsDe(g.id).map((s) => s.id)]
  const todosIds = [...fluxo.keys()]
  const resultadoCol = (c: Coluna) => agg(todosIds, c.dias)

  const alternar = (set: ReadonlySet<string>, setter: (s: ReadonlySet<string>) => void, id: string) => {
    const n = new Set(set)
    n.has(id) ? n.delete(id) : n.add(id)
    setter(n)
  }

  const totalMes = agg(todosIds, todosDias)

  // Resumo visual: grupos-raiz com o fluxo do mês inteiro, separados pelo lado dominante.
  const magnitude = (f: Fluxo) => f.prevEntrada + f.prevSaida + f.realEntrada + f.realSaida
  const gruposMes = [
    ...raiz.map((g) => ({ id: g.id, nome: g.nome, f: agg(idsDoGrupo(g), todosDias) })),
    ...(fluxo.has(A_CONCILIAR) ? [{ id: A_CONCILIAR, nome: 'A conciliar', f: agg([A_CONCILIAR], todosDias) }] : []),
  ]
    .filter((g) => magnitude(g.f) !== 0)
    .sort((a, b) => magnitude(b.f) - magnitude(a.f))
  const ehEntrada = (f: Fluxo) => f.prevEntrada + f.realEntrada >= f.prevSaida + f.realSaida

  return (
    <div className="flex flex-col gap-4">
      <ResumoExecucao total={totalMes} />
      <Segmento opcoes={VISTAS_FLUXO} valor={vista} onTrocar={setVista} />
      {vista === 'visual' ? (
        <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <CardLadoFluxo titulo="Entradas" natureza="R" descReal="Recebido" grupos={gruposMes.filter((g) => ehEntrada(g.f))} />
          <CardLadoFluxo titulo="Saídas" natureza="P" descReal="Pago" grupos={gruposMes.filter((g) => !ehEntrada(g.f))} />
        </section>
      ) : null}
      <div className={`overflow-x-auto rounded-card border border-bd bg-surface ${vista === 'visual' ? 'hidden' : ''}`}>
        <table className="w-full border-collapse text-xs">
          <Cabecalho colunas={colunas} onExpandir={(id) => alternar(semExpandida, setSemExpandida, id)} expandidas={semExpandida} />
          <tbody>
            <LinhaSaldo rotulo="Saldo inicial" valor={saldoInicial} colunas={colunas} primeira />
            {raiz.map((g) => (
              <GrupoLinhas
                key={g.id}
                grupo={g}
                subs={subsDe(g.id)}
                colunas={colunas}
                todosDias={todosDias}
                aberto={grupoAberto.has(g.id)}
                onAlternar={() => alternar(grupoAberto, setGrupoAberto, g.id)}
                agg={agg}
                idsDoGrupo={idsDoGrupo}
              />
            ))}
            {fluxo.has(A_CONCILIAR) ? (
              <GrupoLinhas
                grupo={{ id: A_CONCILIAR, nome: 'A conciliar', paiId: null }}
                subs={[]}
                colunas={colunas}
                todosDias={todosDias}
                aberto={false}
                onAlternar={() => {}}
                agg={agg}
                idsDoGrupo={() => [A_CONCILIAR]}
              />
            ) : null}
            <LinhaResultado rotulo="Resultado" colunas={colunas} fluxoCol={resultadoCol} exec={totalMes} forte />
            <LinhaAcumulado rotulo="Resultado acumulado" colunas={colunas} fluxoCol={resultadoCol} base={0} />
            <LinhaAcumulado rotulo="Saldo / Limite disponível" colunas={colunas} fluxoCol={resultadoCol} base={saldoInicial} forte />
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface GrupoMes {
  readonly id: string
  readonly nome: string
  readonly f: Fluxo
}

/** Card no desenho da referência "Orçado vs. Atual": linhas com barra LARGA de execução.
 * Realizado/Em aberto são magnitudes do grupo (mesma base da barra: pago ÷ pago+aberto). */
function CardLadoFluxo({
  titulo,
  natureza,
  descReal,
  grupos,
}: {
  titulo: string
  natureza: 'R' | 'P'
  descReal: string
  grupos: readonly GrupoMes[]
}) {
  const totReal = grupos.reduce((s, g) => s + g.f.realEntrada + g.f.realSaida, 0)
  const totAberto = grupos.reduce((s, g) => s + g.f.prevEntrada + g.f.prevSaida, 0)
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-card border border-bd bg-surface p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo} · execução do mês</h3>
      {grupos.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-6 text-center text-sm text-muted">
          Nenhum grupo com movimento neste mês.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-1.5 pr-3 font-medium">Grupo</th>
              <th className="py-1.5 pr-3 text-right font-medium">{descReal}</th>
              <th className="py-1.5 pr-3 text-right font-medium">Em aberto</th>
              <th className="w-[36%] py-1.5 font-medium">% executado</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <LinhaVisual key={g.id} natureza={natureza} nome={g.nome} real={g.f.realEntrada + g.f.realSaida} aberto={g.f.prevEntrada + g.f.prevSaida} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-bd font-semibold">
              <td className="py-2 pr-3">Total {titulo}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{brl(totReal)}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-muted">{brl(totAberto)}</td>
              <td className="py-2">
                <BarraExec natureza={natureza} real={totReal} aberto={totAberto} />
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

function LinhaVisual({ natureza, nome, real, aberto }: { natureza: 'R' | 'P'; nome: string; real: number; aberto: number }) {
  return (
    <tr className="border-t border-bd/50">
      <td className="max-w-0 truncate py-1.5 pr-3" title={nome}>
        {nome}
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums">{real !== 0 ? brl(real) : '—'}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums text-muted">{aberto !== 0 ? brl(aberto) : '—'}</td>
      <td className="py-1.5">
        <BarraExec natureza={natureza} real={real} aberto={aberto} />
      </td>
    </tr>
  )
}

function BarraExec({ natureza, real, aberto }: { natureza: 'R' | 'P'; real: number; aberto: number }) {
  const base = real + aberto
  const pct = base > 0 ? Math.round((real / base) * 100) : null
  return (
    <div className="flex min-w-[9rem] items-center gap-2" title={pct === null ? 'Sem base no mês' : `${brl(real)} de ${brl(base)} (${pct}%)`}>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface2">
        {pct !== null ? (
          <div className={`h-full rounded-full ${natureza === 'R' ? 'bg-accent' : 'bg-danger'}`} style={{ width: `${pct}%` }} />
        ) : null}
      </div>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">{pct === null ? '—' : `${pct}%`}</span>
    </div>
  )
}

/** Anéis estilo "Orçado vs. Atual" (referência 02/08): % EXECUTADO do mês por lado —
 * pago ÷ (pago + em aberto). Nesta tela "previsto" é o que resta em aberto, então
 * % executado é a leitura honesta (não % do orçado — orçamento é outra fonte). */
function ResumoExecucao({ total }: { total: Fluxo }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CardExecucao natureza="R" titulo="Entradas do mês" real={total.realEntrada} aberto={total.prevEntrada} descReal="recebido" descAberto="a receber" />
      <CardExecucao natureza="P" titulo="Saídas do mês" real={total.realSaida} aberto={total.prevSaida} descReal="pago" descAberto="a pagar" />
    </section>
  )
}

function CardExecucao({
  natureza,
  titulo,
  real,
  aberto,
  descReal,
  descAberto,
}: {
  natureza: 'R' | 'P'
  titulo: string
  real: number
  aberto: number
  descReal: string
  descAberto: string
}) {
  const base = real + aberto
  const pct = base > 0 ? Math.round((real / base) * 100) : null
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-bd bg-surface p-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo} · % executado</h3>
        <p className="mt-1 text-xs text-muted">
          <strong className={natureza === 'R' ? 'text-accent' : 'text-danger'}>{brl(real)}</strong> {descReal} ·{' '}
          {brl(aberto)} {descAberto}
        </p>
        {pct === null ? <p className="mt-1 text-xs text-muted">Sem movimento nem título em aberto neste mês.</p> : null}
      </div>
      <AnelExecucao pct={pct} natureza={natureza} rotulo={`${titulo}: % executado`} />
    </div>
  )
}

function Cabecalho({
  colunas,
  expandidas,
  onExpandir,
}: {
  colunas: readonly Coluna[]
  expandidas: ReadonlySet<string>
  onExpandir: (id: string) => void
}) {
  return (
    <thead>
      <tr className="border-b border-bd text-[10px] uppercase tracking-wide text-muted">
        <th rowSpan={2} className="sticky left-0 z-10 bg-surface px-3 py-2 text-left">
          Categoria
        </th>
        {colunas.map((c) => (
          <th key={c.id} colSpan={2} className="border-l border-bd px-2 py-1.5 text-center">
            {c.semana ? (
              <ThSemana c={c} expandidas={expandidas} onExpandir={onExpandir} />
            ) : c.recolherSemanaId ? (
              <ThSemana c={c} expandidas={expandidas} onExpandir={onExpandir} />
            ) : (
              c.rotulo
            )}
          </th>
        ))}
        <th rowSpan={2} className="border-l border-bd px-2 py-1.5 text-center">
          Execução
        </th>
      </tr>
      <tr className="border-b border-bd text-[9px] uppercase tracking-wide text-muted/70">
        {colunas.map((c) => (
          <CelulasHead key={c.id} />
        ))}
      </tr>
    </thead>
  )
}

function ThSemana({
  c,
  expandidas,
  onExpandir,
}: {
  c: Coluna
  expandidas: ReadonlySet<string>
  onExpandir: (id: string) => void
}) {
  const s = c.semana
  if (s) {
    return (
      <button type="button" onClick={() => onExpandir(s.id)} className="hover:text-text" title="Ver dias da semana">
        <span className={`mr-1 inline-block transition-transform ${expandidas.has(s.id) ? 'rotate-90' : ''}`}>▸</span>
        {c.rotulo}
      </button>
    )
  }
  return (
    <button type="button" onClick={() => onExpandir(c.recolherSemanaId!)} className="hover:text-text" title="Recolher semana">
      <span className="mr-1 inline-block rotate-90">▸</span>
      {c.rotulo}
    </button>
  )
}

function CelulasHead() {
  return (
    <>
      <th className="border-l border-bd px-2 py-1 text-right font-medium">Prev</th>
      <th className="px-2 py-1 text-right font-medium">Real</th>
    </>
  )
}

function Par({ prev, real, forte }: { prev: number; real: number; forte?: boolean }) {
  return (
    <>
      <td className={`border-l border-bd px-2 py-1 text-right tabular-nums ${forte ? 'font-semibold' : ''} ${cor(prev)}`}>{cell(prev)}</td>
      <td className={`px-2 py-1 text-right tabular-nums ${forte ? 'font-semibold' : ''} ${cor(real)}`}>{cell(real)}</td>
    </>
  )
}

const cor = (v: number) => (v < 0 ? 'text-danger' : v > 0 ? 'text-text' : 'text-muted/50')
const cell = (v: number) => (v === 0 ? '–' : brl(v))

function GrupoLinhas({
  grupo,
  subs,
  colunas,
  todosDias,
  aberto,
  onAlternar,
  agg,
  idsDoGrupo,
}: {
  grupo: No
  subs: readonly No[]
  colunas: readonly Coluna[]
  todosDias: readonly string[]
  aberto: boolean
  onAlternar: () => void
  agg: (ids: readonly string[], dias: readonly string[]) => Fluxo
  idsDoGrupo: (g: No) => string[]
}) {
  const ids = idsDoGrupo(grupo)
  return (
    <>
      <tr className="border-b border-bd/40 hover:bg-surface2/30">
        <td className="sticky left-0 z-10 bg-surface px-3 py-1.5 font-medium">
          <span className="flex items-center gap-1.5">
            {subs.length ? (
              <button type="button" onClick={onAlternar} className={`text-[9px] text-muted transition-transform ${aberto ? 'rotate-90' : ''}`}>
                ▸
              </button>
            ) : (
              <span className="w-2" />
            )}
            {grupo.nome}
          </span>
        </td>
        {colunas.map((c) => {
          const f = agg(ids, c.dias)
          return <Par key={c.id} prev={liquidoPrevisto(f)} real={liquidoRealizado(f)} />
        })}
        <CelExec f={agg(ids, todosDias)} />
      </tr>
      {aberto
        ? subs.map((s) => (
            <tr key={s.id} className="border-b border-bd/30 bg-surface2/20 text-muted">
              <td className="sticky left-0 z-10 bg-surface2/20 py-1 pl-9 pr-3">↳ {s.nome}</td>
              {colunas.map((c) => {
                const f = agg([s.id], c.dias)
                return <Par key={c.id} prev={liquidoPrevisto(f)} real={liquidoRealizado(f)} />
              })}
              <CelExec f={agg([s.id], todosDias)} />
            </tr>
          ))
        : null}
    </>
  )
}

/** Barra de execução do mês (estilo "% do Orçado" da referência): pago ÷ (pago + em aberto). */
function CelExec({ f }: { f: Fluxo }) {
  const realMag = f.realEntrada + f.realSaida
  const base = realMag + f.prevEntrada + f.prevSaida
  if (base === 0) {
    return <td className="border-l border-bd px-2 py-1 text-right text-muted/50">–</td>
  }
  const pct = Math.round((realMag / base) * 100)
  const entrada = f.prevEntrada + f.realEntrada >= f.prevSaida + f.realSaida
  return (
    <td className="border-l border-bd px-2 py-1">
      <div className="flex min-w-[6rem] items-center gap-1.5" title={`Executado: ${brl(realMag)} de ${brl(base)} do mês (${pct}%)`}>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
          <div className={`h-full rounded-full ${entrada ? 'bg-accent' : 'bg-danger'}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-8 shrink-0 text-right tabular-nums text-muted">{pct}%</span>
      </div>
    </td>
  )
}

function LinhaResultado({
  rotulo,
  colunas,
  fluxoCol,
  exec,
  forte,
}: {
  rotulo: string
  colunas: readonly Coluna[]
  fluxoCol: (c: Coluna) => Fluxo
  exec: Fluxo
  forte?: boolean
}) {
  return (
    <tr className="border-y border-bd bg-surface2/40">
      <td className="sticky left-0 z-10 bg-surface2/40 px-3 py-1.5 font-bold uppercase tracking-wide">{rotulo}</td>
      {colunas.map((c) => {
        const f = fluxoCol(c)
        return <Par key={c.id} prev={liquidoPrevisto(f)} real={liquidoRealizado(f)} forte={forte} />
      })}
      <CelExec f={exec} />
    </tr>
  )
}

/** Linha de acumulado: soma corrente do resultado coluna a coluna (ignora a coluna total). */
function LinhaAcumulado({
  rotulo,
  colunas,
  fluxoCol,
  base,
  forte,
}: {
  rotulo: string
  colunas: readonly Coluna[]
  fluxoCol: (c: Coluna) => Fluxo
  base: number
  forte?: boolean
}) {
  let accPrev = base
  let accReal = base
  return (
    <tr className="border-b border-bd bg-surface2/40">
      <td className="sticky left-0 z-10 bg-surface2/40 px-3 py-1.5 font-semibold uppercase tracking-wide text-muted">{rotulo}</td>
      {colunas.map((c) => {
        if (c.id === 'total') {
          return <Par key={c.id} prev={accPrev} real={accReal} forte={forte} />
        }
        const f = fluxoCol(c)
        accPrev += liquidoPrevisto(f)
        accReal += liquidoRealizado(f)
        return <Par key={c.id} prev={accPrev} real={accReal} forte={forte} />
      })}
      <td className="border-l border-bd" />
    </tr>
  )
}

function LinhaSaldo({ rotulo, valor, colunas, primeira }: { rotulo: string; valor: number; colunas: readonly Coluna[]; primeira?: boolean }) {
  return (
    <tr className="border-b border-bd bg-surface2/40">
      <td className="sticky left-0 z-10 bg-surface2/40 px-3 py-1.5 font-semibold uppercase tracking-wide text-muted">{rotulo}</td>
      {colunas.map((c, i) => (
        <Par key={c.id} prev={primeira && i === 0 ? valor : 0} real={primeira && i === 0 ? valor : 0} forte />
      ))}
      <td className="border-l border-bd" />
    </tr>
  )
}
