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

export function FluxoSemanal({ semanas, estrutura, fluxo, saldoInicial }: Props) {
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

  return (
    <div className="overflow-x-auto rounded-card border border-bd bg-surface">
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
              aberto={false}
              onAlternar={() => {}}
              agg={agg}
              idsDoGrupo={() => [A_CONCILIAR]}
            />
          ) : null}
          <LinhaResultado rotulo="Resultado" colunas={colunas} fluxoCol={resultadoCol} forte />
          <LinhaAcumulado rotulo="Resultado acumulado" colunas={colunas} fluxoCol={resultadoCol} base={0} />
          <LinhaAcumulado rotulo="Saldo / Limite disponível" colunas={colunas} fluxoCol={resultadoCol} base={saldoInicial} forte />
        </tbody>
      </table>
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
              <button type="button" onClick={() => onExpandir(c.semana!.id)} className="hover:text-text" title="Ver dias da semana">
                <span className={`mr-1 inline-block transition-transform ${expandidas.has(c.semana.id) ? 'rotate-90' : ''}`}>▸</span>
                {c.rotulo}
              </button>
            ) : c.recolherSemanaId ? (
              <button type="button" onClick={() => onExpandir(c.recolherSemanaId!)} className="hover:text-text" title="Recolher semana">
                <span className="mr-1 inline-block rotate-90">▸</span>
                {c.rotulo}
              </button>
            ) : (
              c.rotulo
            )}
          </th>
        ))}
      </tr>
      <tr className="border-b border-bd text-[9px] uppercase tracking-wide text-muted/70">
        {colunas.map((c) => (
          <CelulasHead key={c.id} />
        ))}
      </tr>
    </thead>
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
  aberto,
  onAlternar,
  agg,
  idsDoGrupo,
}: {
  grupo: No
  subs: readonly No[]
  colunas: readonly Coluna[]
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
      </tr>
      {aberto
        ? subs.map((s) => (
            <tr key={s.id} className="border-b border-bd/30 bg-surface2/20 text-muted">
              <td className="sticky left-0 z-10 bg-surface2/20 py-1 pl-9 pr-3">↳ {s.nome}</td>
              {colunas.map((c) => {
                const f = agg([s.id], c.dias)
                return <Par key={c.id} prev={liquidoPrevisto(f)} real={liquidoRealizado(f)} />
              })}
            </tr>
          ))
        : null}
    </>
  )
}

function LinhaResultado({
  rotulo,
  colunas,
  fluxoCol,
  forte,
}: {
  rotulo: string
  colunas: readonly Coluna[]
  fluxoCol: (c: Coluna) => Fluxo
  forte?: boolean
}) {
  return (
    <tr className="border-y border-bd bg-surface2/40">
      <td className="sticky left-0 z-10 bg-surface2/40 px-3 py-1.5 font-bold uppercase tracking-wide">{rotulo}</td>
      {colunas.map((c) => {
        const f = fluxoCol(c)
        return <Par key={c.id} prev={liquidoPrevisto(f)} real={liquidoRealizado(f)} forte={forte} />
      })}
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
    </tr>
  )
}
