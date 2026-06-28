/** @file Plano de contas cru da Omie (árvore de categorias) — fonte read-only do de-para. */
import { useMemo, useState } from 'react'
import type { Categoria, Natureza } from '@/core/categoria'
import { useCadastros } from '@/lib/cadastros'
import { COR_NATUREZA, ROTULO_NATUREZA, profundidade } from '@/lib/natureza'
import { KpiCard } from './KpiCard.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'

type Filtro = 'todas' | Natureza

const FILTROS: readonly OpcaoSeg<Filtro>[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'receita', rotulo: 'Receitas' },
  { id: 'despesa', rotulo: 'Despesas' },
  { id: 'transferencia', rotulo: 'Transferências' },
]

export function CategoriasPanel() {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')
  const { relatorio, categorias, geradoEm } = useCadastros().categorias

  const visiveis = useMemo(() => filtrar(categorias, filtro, busca), [categorias, filtro, busca])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Plano de Contas</h1>
        <p className="text-sm text-muted">
          Espelho das categorias da Omie · {relatorio.total} contas · sincronizado em{' '}
          {new Date(geradoEm).toLocaleString('pt-BR')}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard rotulo="Total de contas" valor={relatorio.total} cor="primary" />
        <KpiCard rotulo="Receitas" valor={relatorio.porNatureza.receita} cor="accent" />
        <KpiCard rotulo="Despesas" valor={relatorio.porNatureza.despesa} cor="danger" />
        <KpiCard rotulo="Transferências" valor={relatorio.porNatureza.transferencia} cor="secondary" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmento opcoes={FILTROS} valor={filtro} onTrocar={setFiltro} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por código ou descrição…"
          className="w-64 rounded-lg border border-bd bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-primary"
        />
      </div>

      <Tabela categorias={visiveis} />
    </div>
  )
}


function Tabela({ categorias }: { categorias: readonly Categoria[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-bd bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bd text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Código</th>
            <th className="px-4 py-3 font-medium">Descrição</th>
            <th className="px-4 py-3 font-medium">Natureza</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">DRE</th>
          </tr>
        </thead>
        <tbody>
          {categorias.map((c) => (
            <Linha key={c.codigo} c={c} />
          ))}
          {categorias.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted">
                Nenhuma categoria encontrada.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function Linha({ c }: { c: Categoria }) {
  return (
    <tr className="border-b border-bd/60 last:border-0 hover:bg-surface2/50">
      <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-muted">{c.codigo}</td>
      <td className="px-4 py-2.5" style={{ paddingLeft: 16 + profundidade(c.codigo) * 16 }}>
        <span className={c.agrupadora ? 'font-semibold' : ''}>{c.descricao}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COR_NATUREZA[c.natureza]}`}>
          {ROTULO_NATUREZA[c.natureza]}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-muted">{c.agrupadora ? 'Classe' : 'Analítica'}</td>
      <td className="px-4 py-2.5 text-xs">{c.entraNoDre ? '✓' : '—'}</td>
    </tr>
  )
}

function filtrar(
  categorias: readonly Categoria[],
  filtro: Filtro,
  busca: string,
): Categoria[] {
  const termo = busca.trim().toLowerCase()
  return categorias.filter((c) => {
    const okNatureza = filtro === 'todas' || c.natureza === filtro
    const okBusca =
      !termo || c.codigo.toLowerCase().includes(termo) || c.descricao.toLowerCase().includes(termo)
    return okNatureza && okBusca
  })
}
