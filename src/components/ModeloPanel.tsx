/** @file Matriz de Classificações: conciliação manual de categorias e fornecedores na estrutura AG, com sugestões da matriz e modal de movimentos. */
import { useMemo, useState } from 'react'
import { sugerirClassificacao } from '@/core/matriz-classificacao'
import type { Dimensao, RegimeDemo } from '@/core/modelo'
import type { Movimento } from '@/core/movimento'
import type { Resolvedor } from '@/core/override'
import type { CategoriasSeed } from '@/core/categoria'
import { dataDoMovimento } from '@/core/periodo'
import { useCadastros } from '@/lib/cadastros'
import { useMovimentos } from '@/lib/movimentos'
import { SeletorMeses, type FaixaMeses } from './SeletorMeses.tsx'
import { porCategoria } from '@/lib/agregar'
import { aplicarFiltros, FILTROS_VAZIOS, type Filtros } from '@/lib/filtros'
import { brl } from '@/lib/money'
import { useOverrides } from '@/lib/overrides'
import { useModelo } from '@/lib/useModelo'
import { ConciliacaoBoard, type ItemConc } from './conciliacao/ConciliacaoBoard.tsx'
import { FiltrosBar } from './FiltrosBar.tsx'
import { KpiCard } from './KpiCard.tsx'
import { ResumoPeriodo } from './ResumoPeriodo.tsx'
import { MovimentosModal } from './MovimentosModal.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'

// A dimensão `centros` existe no Modelo mas NÃO entra como aba de conciliação:
// filial vem automaticamente do rateio Omie, com ajuste manual por movimento no
// detalhamento (decisão Ricalfiff 2026-06-10 — conciliar por contraparte não convém).
const DIMENSOES: readonly OpcaoSeg<Dimensao>[] = [
  { id: 'contas', rotulo: 'Contas / Subcategorias' },
  { id: 'fornecedores', rotulo: 'Fornecedores' },
]

const TERMO_DIM: Readonly<Record<Dimensao, string>> = {
  contas: 'a categoria',
  fornecedores: 'o fornecedor',
  centros: 'a contraparte',
}

const PLACEHOLDER_DIM: Readonly<Record<Dimensao, string>> = {
  contas: 'Novo grupo de contas…',
  fornecedores: 'Novo grupo de fornecedores…',
  centros: 'Nova filial / centro de custo…',
}

export function ModeloPanel() {
  const api = useModelo()
  const [dim, setDim] = useState<Dimensao>('contas')
  const [nomeGrupo, setNomeGrupo] = useState('')
  const [regimeGrupo, setRegimeGrupo] = useState<RegimeDemo>('ambos')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const [faixa, setFaixa] = useState<FaixaMeses>({ de: null, ate: null })
  const [modalChave, setModalChave] = useState<string | null>(null)

  const { resolvedor, overrides } = useOverrides()
  const { movimentos: todos } = useMovimentos()
  const { categorias: cad } = useCadastros()
  const nomesEditados = Object.keys(dim === 'contas' ? overrides.categoria : overrides.contraparte).length
  // Periodização opcional da VISUALIZAÇÃO (a conciliação em si continua valendo pra sempre —
  // mapear categoria→grupo não tem recorte; o calendário só recorta o que está na tela).
  const noPeriodo = useMemo(() => {
    if (!faixa.de && !faixa.ate) return todos
    return todos.filter((m) => {
      const mes = dataDoMovimento(m, 'competencia')?.slice(0, 7)
      if (!mes) return false
      if (faixa.de && mes < faixa.de) return false
      if (faixa.ate && mes > faixa.ate) return false
      return true
    })
  }, [todos, faixa])
  const movs = useMemo(() => aplicarFiltros(noPeriodo, filtros), [noPeriodo, filtros])
  const itensContas = useMemo(() => itensDeContas(movs, resolvedor, cad.categorias), [movs, resolvedor, cad])
  const itensForn = useMemo(() => itensDeFornecedores(movs, resolvedor), [movs, resolvedor])
  const itens = dim === 'contas' ? itensContas : itensForn

  const conc = api.modelo[dim]
  const conciliados = itens.filter((i) => conc.mapa[i.chave])
  const valorConciliado = conciliados.reduce((a, i) => a + i.valorCentavos, 0)
  const grupos = conc.estrutura.filter((n) => !n.paiId).length

  function criar() {
    api.addNo(dim, nomeGrupo, null, dim === 'contas' ? regimeGrupo : undefined)
    setNomeGrupo('')
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Matriz de Classificações</h1>
          <p className="text-sm text-muted">
            Padronização manual · arraste o item para o grupo (2 níveis: grupo → subgrupo) · salvo no
            navegador
          </p>
          {nomesEditados > 0 ? (
            <p className="mt-1 text-xs text-warn">
              {nomesEditados} nome(s) editado(s) vs Omie (original imutável · clique direito para ver/reverter)
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => api.restaurar(dim)}
          className="rounded-lg border border-bd px-3 py-1.5 text-sm font-medium text-muted hover:text-text"
        >
          Restaurar estrutura padrão
        </button>
      </header>

      <ResumoPeriodo
        contexto="sem-recorte"
        rotulo={faixa.de || faixa.ate ? 'Visualizando um recorte — a conciliação vale para o período inteiro' : 'Conciliando TODOS os lançamentos — o calendário abaixo só recorta a visualização'}
        movimentos={movs}
      />

      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">Período</span>
        <SeletorMeses faixa={faixa} onChange={setFaixa} />
      </div>

      <Segmento opcoes={DIMENSOES} valor={dim} onTrocar={setDim} />

      <FiltrosBar movimentos={todos} filtros={filtros} onChange={setFiltros} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo="Grupos" valor={grupos} cor="primary" />
        <KpiCard rotulo="Conciliados" valor={`${conciliados.length}/${itens.length}`} cor="secondary" />
        <KpiCard rotulo="Valor conciliado" valor={brl(valorConciliado)} cor="accent" />
      </section>

      <BarraProgresso feito={conciliados.length} total={itens.length} />

      <div className="flex gap-2">
        <input
          value={nomeGrupo}
          onChange={(e) => setNomeGrupo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && criar()}
          placeholder={PLACEHOLDER_DIM[dim]}
          className="flex-1 rounded-lg border border-bd bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-primary"
        />
        {dim === 'contas' ? (
          <select
            value={regimeGrupo}
            onChange={(e) => setRegimeGrupo(e.target.value as RegimeDemo)}
            title="Em quais demonstrações o grupo entra"
            className="rounded-lg border border-bd bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="ambos">DRE + DFC</option>
            <option value="dre">Só DRE</option>
            <option value="dfc">Só DFC</option>
          </select>
        ) : null}
        <button
          type="button"
          onClick={criar}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary"
        >
          + Grupo
        </button>
      </div>

      <ConciliacaoBoard
        conc={conc}
        itens={itens}
        entidade={dim === 'contas' ? 'categoria' : 'contraparte'}
        termo={TERMO_DIM[dim]}
        sugerir={dim === 'contas' ? sugerirClassificacao : undefined}
        onAddNo={(nome, paiId, regime) => api.addNo(dim, nome, paiId, regime)}
        onRemoveNo={(id) => api.removeNo(dim, id)}
        onRenomearNo={(id, nome) => api.renomearNo(dim, id, nome)}
        onDefinirRegime={(id, regime) => api.definirRegime(dim, id, regime)}
        onMapear={(chave, noId) => api.mapear(dim, chave, noId)}
        onDesmapear={(chave) => api.desmapear(dim, chave)}
        onVerMovimentos={setModalChave}
      />

      {modalChave ? (
        <MovimentosModal
          titulo={tituloDaChave(modalChave, dim, resolvedor)}
          codigo={modalChave}
          subtitulo="Movimentos da seleção · dados crus da Omie"
          movimentos={movsDaChave(movs, modalChave, dim)}
          eixosIniciais={dim === 'contas' ? ['contraparte'] : ['categoria']}
          onFechar={() => setModalChave(null)}
        />
      ) : null}
    </div>
  )
}

function movsDaChave(movs: readonly Movimento[], chave: string, dim: Dimensao): Movimento[] {
  if (dim === 'contas') return movs.filter((m) => m.categoria === chave)
  return movs.filter((m) => (m.contraparteCodigo || 'SEM') === chave)
}

function tituloDaChave(chave: string, dim: Dimensao, resolvedor: Resolvedor): string {
  return dim === 'contas' ? resolvedor.categoria(chave).nome : resolvedor.contraparte(chave).nome
}

function BarraProgresso({ feito, total }: { feito: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((feito / total) * 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-muted">
        <span>Progresso da conciliação</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function itensDeContas(movs: readonly Movimento[], resolvedor: Resolvedor, categorias: CategoriasSeed['categorias']): ItemConc[] {
  return porCategoria(movs, categorias).map((l) => ({
    chave: l.codigo,
    titulo: `${l.codigo} · ${resolvedor.categoria(l.codigo).nome}`,
    valorCentavos: l.totalCentavos,
    qtd: l.quantidade,
  }))
}

function itensDeFornecedores(movs: readonly Movimento[], resolvedor: Resolvedor): ItemConc[] {
  const acc = new Map<string, { valor: number; qtd: number }>()
  for (const m of movs) {
    const chave = m.contraparteCodigo || 'SEM'
    const atual = acc.get(chave) ?? { valor: 0, qtd: 0 }
    atual.valor += m.valorCentavos
    atual.qtd += 1
    acc.set(chave, atual)
  }
  return [...acc.entries()]
    .map(([codigo, v]) => ({
      chave: codigo,
      titulo: resolvedor.contraparte(codigo).nome,
      valorCentavos: v.valor,
      qtd: v.qtd,
    }))
    .sort((a, b) => b.valorCentavos - a.valorCentavos)
}
