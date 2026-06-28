/**
 * @file Linhas da tabela de demonstração: linha principal expansível, grupos componentes (drill)
 * e células compartilhadas (Δ anterior, AV%, valor, lupa de fontes).
 */
import type { LinhaCalc } from '@/core/demonstracao'
import { ordemGrupo } from '@/lib/graficos'
import { brl, fracVariacao, pct, pctVariacao } from '@/lib/money'
import type { GrupoEspelho } from '@/lib/resultado'
import type { AlvoDetalhe } from './useDetalheDemonstracao.tsx'

interface PropsLinha {
  readonly l: LinhaCalc
  readonly base: number
  readonly porId: ReadonlyMap<string, GrupoEspelho>
  /** null = coluna Δ desligada; número = valor da linha no período anterior. */
  readonly valorAnterior: number | null
  readonly aberta: boolean
  readonly onAlternar: (id: string) => void
  readonly onDetalhar?: (alvo: AlvoDetalhe) => void
}

export function Linha({ l, base, porId, valorAnterior, aberta, onAlternar, onDetalhar }: PropsLinha) {
  const expansivel = l.gruposIds.length > 0
  // Ordena os grupos do drill pelo número (1, 2, 3…), não pela ordem de iteração dos movimentos.
  const componentes = aberta
    ? l.gruposIds
        .map((g) => porId.get(g))
        .filter((g): g is GrupoEspelho => g !== undefined)
        .sort((a, b) => ordemGrupo(a.nome) - ordemGrupo(b.nome))
    : []
  return (
    <>
      <tr
        className={`border-b border-bd/50 last:border-0 ${l.tipo === 'subtotal' ? 'bg-surface2/50 font-bold' : ''} ${expansivel ? 'cursor-pointer hover:bg-surface2/30' : ''}`}
        onClick={expansivel ? () => onAlternar(l.id) : undefined}
        aria-expanded={expansivel ? aberta : undefined}
        title={expansivel ? 'Clique para detalhar os grupos desta linha' : undefined}
      >
        <td className="px-4 py-2.5">
          {expansivel ? (
            <span
              className="mr-2 inline-block text-[10px] text-muted transition-transform"
              style={{ transform: aberta ? 'none' : 'rotate(-90deg)' }}
            >
              ▼
            </span>
          ) : null}
          {l.nome}
        </td>
        <CelulaDelta atual={l.valorCentavos} anterior={valorAnterior} />
        <CelulasValor valor={l.valorCentavos} base={base} />
        <CelulaDetalhe alvo={expansivel ? { titulo: l.nome, ids: l.gruposIds } : null} onDetalhar={onDetalhar} />
      </tr>
      {componentes.map((g) => (
        <LinhasGrupo key={g.id} grupo={g} base={base} deltaLigado={valorAnterior !== null} onDetalhar={onDetalhar} />
      ))}
    </>
  )
}

interface PropsGrupo {
  readonly grupo: GrupoEspelho
  readonly base: number
  readonly deltaLigado: boolean
  readonly onDetalhar?: (a: AlvoDetalhe) => void
}

function LinhasGrupo({ grupo, base, deltaLigado, onDetalhar }: PropsGrupo) {
  return (
    <>
      <tr className="border-b border-bd/30 text-muted">
        <td className="py-1.5 pl-10 pr-4 text-xs font-medium">↳ {grupo.nome}</td>
        {deltaLigado ? <td /> : null}
        <CelulasValor valor={grupo.totalCentavos} base={base} compacta />
        <CelulaDetalhe alvo={{ titulo: grupo.nome, ids: [grupo.id] }} onDetalhar={onDetalhar} compacta />
      </tr>
      {[...grupo.subgrupos]
        .sort((a, b) => Math.abs(b.totalCentavos) - Math.abs(a.totalCentavos))
        .map((s) => (
        <tr key={s.id} className="border-b border-bd/20 text-muted/80">
          <td className="py-1 pl-14 pr-4 text-xs">{s.nome}</td>
          {deltaLigado ? <td /> : null}
          <CelulasValor valor={s.totalCentavos} base={base} compacta />
          <CelulaDetalhe alvo={{ titulo: s.nome, ids: [s.id] }} onDetalhar={onDetalhar} compacta />
        </tr>
      ))}
    </>
  )
}

/** Análise horizontal: variação vs período anterior. Base zero → '—' (sem % inventado). */
function CelulaDelta({ atual, anterior }: { atual: number; anterior: number | null }) {
  if (anterior === null) return null
  const frac = fracVariacao(atual, anterior)
  const cor = frac === null ? 'text-muted' : frac >= 0 ? 'text-accent' : 'text-danger'
  return (
    <td className={`px-4 py-2.5 text-right text-xs tabular-nums ${cor}`} title={`anterior: ${brl(anterior)}`}>
      {pctVariacao(frac)}
    </td>
  )
}

interface PropsDetalhe {
  readonly alvo: AlvoDetalhe | null
  readonly onDetalhar?: (a: AlvoDetalhe) => void
  readonly compacta?: boolean
}

/** Botão de lupa da coluna final: abre o dashboard de fontes (fornecedores + transações). */
function CelulaDetalhe({ alvo, onDetalhar, compacta }: PropsDetalhe) {
  if (!onDetalhar) return null
  return (
    <td className={`pr-3 text-right ${compacta ? 'py-1' : 'py-2'}`}>
      {alvo ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDetalhar(alvo)
          }}
          title={`Fontes de "${alvo.titulo}": fornecedores e transações`}
          className="rounded-md border border-bd px-1.5 py-0.5 text-xs text-muted transition-colors hover:border-primary hover:text-secondary"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      ) : null}
    </td>
  )
}

function CelulasValor({ valor, base, compacta }: { valor: number; base: number; compacta?: boolean }) {
  const pad = compacta ? 'py-1.5' : 'py-2.5'
  return (
    <>
      {base ? <td className={`px-4 ${pad} text-right text-xs tabular-nums text-muted`}>{pct(valor, base)}</td> : null}
      <td className={`px-4 ${pad} text-right tabular-nums ${compacta ? 'text-xs' : ''} ${valor < 0 ? 'text-danger' : ''}`}>
        {brl(valor)}
      </td>
    </>
  )
}
