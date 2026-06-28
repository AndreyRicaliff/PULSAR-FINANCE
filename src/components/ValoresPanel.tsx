/** @file Valores por categoria com drill-down em modal. */
import { useMemo, useState } from 'react'
import { useCadastros } from '@/lib/cadastros'
import { useMovimentos } from '@/lib/movimentos'
import { porCategoria, type LinhaCategoria } from '@/lib/agregar'
import { montarArvore, semCancelados, type NoCategoria } from '@/lib/arvore'
import { brl } from '@/lib/money'
import { COR_NATUREZA, ROTULO_NATUREZA } from '@/lib/natureza'
import { useOverrides } from '@/lib/overrides'
import { KpiCard } from './KpiCard.tsx'
import { CategoriaTree } from './CategoriaTree.tsx'
import { MovimentosModal } from './MovimentosModal.tsx'
import { NomeEditavel } from './NomeEditavel.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'

type Vista = 'arvore' | 'lista'

const VISTAS: readonly OpcaoSeg<Vista>[] = [
  { id: 'arvore', rotulo: 'Árvore' },
  { id: 'lista', rotulo: 'Lista' },
]

export function ValoresPanel() {
  const { movimentos: todos } = useMovimentos()
  const { categorias: cad } = useCadastros()
  const [vista, setVista] = useState<Vista>('arvore')
  const [excluirCancelados, setExcluir] = useState(false)
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<LinhaCategoria | null>(null)

  const movs = useMemo(
    () => (excluirCancelados ? semCancelados(todos) : todos),
    [todos, excluirCancelados],
  )
  const arvore = useMemo(() => montarArvore(movs, cad.categorias), [movs, cad])
  const linhas = useMemo(() => porCategoria(movs, cad.categorias), [movs, cad])
  const totalCentavos = useMemo(() => linhas.reduce((a, l) => a + l.totalCentavos, 0), [linhas])
  const visiveis = useMemo(() => filtrar(linhas, busca), [linhas, busca])

  const movsAberta = useMemo(
    () => (aberta ? todos.filter((m) => m.categoria === aberta.codigo) : []),
    [todos, aberta],
  )

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Valores por Categoria</h1>
        <p className="text-sm text-muted">
          Total movimentado na Omie · {movs.length} movimentos · clique numa conta para ver o detalhe
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo="Total movimentado" valor={brl(totalCentavos)} cor="primary" />
        <KpiCard rotulo="Categorias com valor" valor={linhas.length} cor="secondary" />
        <KpiCard rotulo="Movimentos" valor={movs.length} cor="accent" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Segmento opcoes={VISTAS} valor={vista} onTrocar={setVista} />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={excluirCancelados}
              onChange={(e) => setExcluir(e.target.checked)}
              className="accent-primary"
            />
            Excluir cancelados
          </label>
        </div>
        {vista === 'lista' ? (
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código ou descrição…"
            className="w-64 rounded-lg border border-bd bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-primary"
          />
        ) : null}
      </div>

      <div className="overflow-hidden rounded-card border border-bd bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bd text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 text-right font-medium">Movim.</th>
              <th className="px-4 py-3 text-right font-medium">Valor total</th>
            </tr>
          </thead>
          <tbody>
            {vista === 'arvore'
              ? arvore.map((no) => (
                  <CategoriaTree key={no.codigo} no={no} depth={0} onAbrir={(n) => setAberta(noParaLinha(n))} />
                ))
              : visiveis.map((l) => <LinhaFlat key={l.codigo} l={l} onAbrir={() => setAberta(l)} />)}
          </tbody>
        </table>
      </div>

      {aberta ? (
        <MovimentosModal
          codigo={aberta.codigo}
          titulo={aberta.descricao}
          subtitulo={`${aberta.quantidade} movimentos · ${brl(aberta.totalCentavos)}`}
          movimentos={movsAberta}
          onFechar={() => setAberta(null)}
        />
      ) : null}
    </div>
  )
}

function LinhaFlat({ l, onAbrir }: { l: LinhaCategoria; onAbrir: () => void }) {
  const { resolvedor } = useOverrides()
  return (
    <tr onClick={onAbrir} className="cursor-pointer border-b border-bd/60 last:border-0 hover:bg-surface2">
      <td className="px-4 py-2.5">
        <span className="mr-2 font-mono text-xs tabular-nums text-muted">{l.codigo}</span>
        <NomeEditavel entidade="categoria" codigo={l.codigo} resolvido={resolvedor.categoria(l.codigo)} />
        <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${COR_NATUREZA[l.natureza]}`}>
          {ROTULO_NATUREZA[l.natureza]}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-muted">{l.quantidade}</td>
      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{brl(l.totalCentavos)}</td>
    </tr>
  )
}

function noParaLinha(no: NoCategoria): LinhaCategoria {
  return {
    codigo: no.codigo,
    descricao: no.descricao,
    natureza: no.natureza,
    quantidade: no.proprioQtd,
    totalCentavos: no.proprioCentavos,
  }
}

function filtrar(linhas: readonly LinhaCategoria[], busca: string): LinhaCategoria[] {
  const termo = busca.trim().toLowerCase()
  if (!termo) return [...linhas]
  return linhas.filter(
    (l) => l.codigo.toLowerCase().includes(termo) || l.descricao.toLowerCase().includes(termo),
  )
}
