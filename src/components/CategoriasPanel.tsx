/** @file Plano de contas cru do ERP (árvore de categorias) — fonte read-only do de-para. */
import { useMemo, useState } from 'react'
import { codigoExibivel, mapaProfundidade, type Categoria, type Natureza } from '@/core/categoria'
import { ehCategoriaManual } from '@/core/categoriaManual'
import { gruposDuplicados, type GrupoDuplicado, type MembroDuplicata } from '@/core/duplicatas'
import { estadoDoNome } from '@/core/estadoRegistro'
import { normalizarTexto } from '@/core/texto'
import { pedirBuscaConciliacao } from '@/lib/buscaConciliacaoPedido'
import { useCadastros } from '@/lib/cadastros'
import { useProvedor } from '@/lib/clientes'
import { useDuplicatasIgnoradas } from '@/lib/duplicatasDoc'
import { COR_NATUREZA, ROTULO_NATUREZA } from '@/lib/natureza'
import { CampoBusca } from './CampoBusca.tsx'
import { EtiquetaEstado } from './EtiquetaEstado.tsx'
import { irParaAba } from './InicioPanel.tsx'
import { KpiCard } from './KpiCard.tsx'
import { SecaoDuplicatas } from './SecaoDuplicatas.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'

type Filtro = 'todas' | Natureza

const FILTROS: readonly OpcaoSeg<Filtro>[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'receita', rotulo: 'Receitas' },
  { id: 'despesa', rotulo: 'Despesas' },
  { id: 'transferencia', rotulo: 'Transferências' },
]

export function CategoriasPanel() {
  const provedor = useProvedor()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')
  const { relatorio, categorias, geradoEm } = useCadastros().categorias

  const visiveis = useMemo(() => filtrar(categorias, filtro, busca), [categorias, filtro, busca])
  // Por paiCodigo, não por pontos do código — GUID Nibo não tem pontos e achataria a hierarquia.
  const profundidades = useMemo(() => mapaProfundidade(categorias), [categorias])

  // Duplicatas por nome LIMPO (sem etiqueta de estado). Categoria NUNCA oferece "unificar":
  // mesmo-nome + código-diferente costuma ser conta legitimamente distinta no plano — aqui
  // é revisão (recolocar na Matriz / marcar legítimo), nunca fusão.
  const { ignoradas, ignorar } = useDuplicatasIgnoradas()
  const duplicatas = useMemo(() => {
    const membros: MembroDuplicata[] = categorias
      .filter((c) => !c.agrupadora)
      .map((c) => {
        const { limpo, estado } = estadoDoNome(c.descricao)
        return { codigo: c.codigo, nome: limpo, estado, totalCentavos: 0, qtd: 0 }
      })
    return gruposDuplicados(membros, ignoradas)
  }, [categorias, ignoradas])

  function recolocar(g: GrupoDuplicado) {
    pedirBuscaConciliacao({ dim: 'contas', termo: g.membros[0]!.nome })
    irParaAba('modelo')
  }
  function naoEhDuplicata(g: GrupoDuplicado) {
    if (window.confirm('Marcar este grupo como legítimo? Ele some da lista de possíveis duplicatas deste cliente.')) ignorar(g.chave)
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[19px] font-semibold">Plano de Contas</h1>
        <p className="text-sm text-muted">
          Espelho das categorias {provedor.de} · {relatorio.total} contas · sincronizado em{' '}
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
        <CampoBusca
          valor={busca}
          onValor={setBusca}
          placeholder="Buscar por código ou descrição…"
          visiveis={visiveis.length}
          total={categorias.length}
          classe="w-80"
        />
      </div>

      <SecaoDuplicatas grupos={duplicatas} onIgnorar={naoEhDuplicata} onRecolocar={recolocar} mostrarValores={false} />

      <Tabela categorias={visiveis} profundidades={profundidades} />
    </div>
  )
}


function Tabela({ categorias, profundidades }: { categorias: readonly Categoria[]; profundidades: ReadonlyMap<string, number> }) {
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
            <Linha key={c.codigo} c={c} nivel={profundidades.get(c.codigo) ?? 0} />
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

function Linha({ c, nivel }: { c: Categoria; nivel: number }) {
  // Estado ESTRUTURAL primeiro (ativa=false é como a Omie marca exclusão de verdade —
  // 278 casos em prod 03/08); marcador no nome cobre quem etiqueta manualmente.
  const doNome = estadoDoNome(c.descricao)
  const limpo = doNome.limpo
  const estado = doNome.estado ?? (c.ativa === false ? 'inativo' : undefined)
  return (
    <tr className="border-b border-bd/60 last:border-0 hover:bg-surface2/50">
      <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-muted">{codigoExibivel(c.codigo) || '—'}</td>
      <td className="px-4 py-2.5" style={{ paddingLeft: 16 + nivel * 16 }}>
        <span className="inline-flex items-center gap-1.5" title={estado ? `Original no ERP: ${c.descricao}` : undefined}>
          <span className={c.agrupadora ? 'font-semibold' : ''}>{limpo}</span>
          {estado ? <EtiquetaEstado estado={estado} /> : null}
          {ehCategoriaManual(c.codigo) ? (
            <span className="shrink-0 rounded-full border border-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
              manual
            </span>
          ) : null}
        </span>
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
  // Padrão dual (UX 03/08): descrição dobra acento/caixa; código casa cru.
  const q = normalizarTexto(busca)
  const qCodigo = busca.trim().toLowerCase()
  return categorias.filter((c) => {
    const okNatureza = filtro === 'todas' || c.natureza === filtro
    const okBusca =
      (!q && !qCodigo) ||
      (qCodigo !== '' && c.codigo.toLowerCase().includes(qCodigo)) ||
      (q !== '' && normalizarTexto(c.descricao).includes(q))
    return okNatureza && okBusca
  })
}
