/**
 * @file Lançamentos manuais: receita/despesa fora da conta bancária (SAIPOS/iFood/Cardápio
 * Web) que o ERP não vê. CRUD do operador; o movimento entra no funil como terceira fonte.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { suspeitasDoLancamento } from '@/core/duplicatas'
import { ORIGENS_SUGERIDAS, type LancamentoManual, type NaturezaManual } from '@/core/lancamento'
import { codigoExibivel, rotuloCategoria, type Categoria } from '@/core/categoria'
import { normalizarTexto } from '@/core/texto'
import { COR_NATUREZA, ROTULO_NATUREZA } from '@/lib/natureza'
import { useCadastros } from '@/lib/cadastros'
import { useLancamentos, type NovoLancamento } from '@/lib/lancamentos'
import { useMovimentos } from '@/lib/movimentos'
import { useOverlay, useTravaScroll } from '@/lib/overlay'
import { brl, centavosDeTexto } from '@/lib/money'
import { CampoBusca } from './CampoBusca.tsx'
import { EtiquetaFluxo } from './conciliacao/EtiquetaFluxo.tsx'
import { EtiquetaEstado } from './EtiquetaEstado.tsx'
import { KpiCard } from './KpiCard.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'

const CLASSE_INPUT =
  'rounded-lg border border-bd bg-surface2 px-4 py-2.5 text-sm outline-none focus:border-primary'

const NATUREZAS: readonly OpcaoSeg<NaturezaManual>[] = [
  { id: 'receita', rotulo: 'Entrada' },
  { id: 'despesa', rotulo: 'Saída' },
]

export function LancamentosManuaisPanel() {
  const { lancamentos, carregando, remover } = useLancamentos()
  const [editando, setEditando] = useState<LancamentoManual | 'novo' | null>(null)

  const entradas = useMemo(
    () => lancamentos.filter((l) => l.natureza === 'receita').reduce((a, l) => a + l.valorCentavos, 0),
    [lancamentos],
  )
  const saidas = useMemo(
    () => lancamentos.filter((l) => l.natureza === 'despesa').reduce((a, l) => a + l.valorCentavos, 0),
    [lancamentos],
  )

  async function confirmarRemocao(l: LancamentoManual) {
    if (!window.confirm(`Remover "${l.descricao}" (${brl(l.valorCentavos)})? O lançamento sai da DRE/DFC.`)) return
    await remover(l.id)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold">Lançamentos Manuais</h1>
          <p className="text-sm text-muted">
            Vendas e despesas que não passam pela conta bancária (iFood, SAIPOS…) — o ERP não
            vê, então entram por aqui e aparecem na DRE/DFC com a etiqueta MANUAL.
          </p>
        </div>
        <button type="button" onClick={() => setEditando('novo')} className="fx-press rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">
          + Novo lançamento
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo="Entradas manuais" valor={brl(entradas)} cor="accent" />
        <KpiCard rotulo="Saídas manuais" valor={brl(-saidas)} cor="danger" />
        <KpiCard rotulo="Lançamentos" valor={lancamentos.length} cor="secondary" />
      </section>

      {carregando ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : lancamentos.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-sm text-muted">
          Nenhum lançamento manual neste cliente. Use “Novo lançamento” para registrar vendas
          de plataforma ou despesas pagas fora da conta.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-bd bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bd text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">Data</th>
                <th className="px-4 py-2.5 font-medium">Descrição</th>
                <th className="px-4 py-2.5 font-medium">Origem</th>
                <th className="px-4 py-2.5 font-medium">Categoria</th>
                <th className="px-4 py-2.5 font-medium">Fluxo</th>
                <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => (
                <LinhaLancamento key={l.id} l={l} onEditar={() => setEditando(l)} onRemover={() => void confirmarRemocao(l)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando !== null ? (
        <FormLancamento original={editando === 'novo' ? null : editando} onFechar={() => setEditando(null)} />
      ) : null}
    </div>
  )
}

function LinhaLancamento({ l, onEditar, onRemover }: { l: LancamentoManual; onEditar: () => void; onRemover: () => void }) {
  const { categorias } = useCadastros()
  const cat = categorias.categorias.find((c) => c.codigo === l.categoria)
  return (
    <tr className="border-b border-bd/40 last:border-0">
      <td className="px-4 py-2.5 tabular-nums text-muted">{dataBr(l.data)}</td>
      <td className="px-4 py-2.5">
        {l.descricao}
        {l.observacao ? <span className="block text-[11px] text-muted/70">{l.observacao}</span> : null}
      </td>
      <td className="px-4 py-2.5">
        <span className="rounded bg-secondary/15 px-1.5 py-0.5 text-[11px] font-semibold text-secondary">{l.origem}</span>
      </td>
      <td className="px-4 py-2.5 text-xs text-muted">
        {cat ? rotuloCategoria(cat.codigo, cat.descricao) : l.categoria}
      </td>
      <td className="px-4 py-2.5"><EtiquetaFluxo natureza={l.natureza} /></td>
      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${l.natureza === 'receita' ? 'text-accent' : 'text-danger'}`}>
        {brl(l.natureza === 'receita' ? l.valorCentavos : -l.valorCentavos)}
      </td>
      <td className="px-4 py-2.5 text-right">
        <button type="button" onClick={onEditar} className="mr-2 text-xs text-muted underline hover:text-text">editar</button>
        <button type="button" onClick={onRemover} className="text-xs text-muted underline hover:text-danger">remover</button>
      </td>
    </tr>
  )
}

function dataBr(iso: string): string {
  const [a, m, d] = iso.split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

/** Modal criar/editar. A natureza filtra as categorias — impossível declarar entrada numa categoria de despesa. */
function FormLancamento({ original, onFechar }: { original: LancamentoManual | null; onFechar: () => void }) {
  const { criar, atualizar } = useLancamentos()
  const { categorias } = useCadastros()
  const { movimentos } = useMovimentos()
  // Fundação de overlay (UX 03/08): Esc fecha o form (só o topo da pilha) + trava o fundo.
  useOverlay(onFechar)
  useTravaScroll()
  const [natureza, setNatureza] = useState<NaturezaManual>(original?.natureza ?? 'receita')
  const [data, setData] = useState(original?.data ?? new Date().toISOString().slice(0, 10))
  const [descricao, setDescricao] = useState(original?.descricao ?? '')
  const [valor, setValor] = useState(original ? (original.valorCentavos / 100).toFixed(2).replace('.', ',') : '')
  const [categoria, setCategoria] = useState(original?.categoria ?? '')
  const [origem, setOrigem] = useState(original?.origem ?? ORIGENS_SUGERIDAS[0] ?? 'IFOOD')
  const [observacao, setObservacao] = useState(original?.observacao ?? '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // TODAS as analíticas, sem exceção (report 03/08): inativa entra COM etiqueta, outra
  // natureza entra SINALIZADA — no Nibo a natureza não-mapeada vira 'outra' e o filtro
  // antigo escondia metade do plano. Ordem: natureza declarada primeiro, ativas primeiro.
  const opcoesCategoria = useMemo(() => {
    const analiticas = categorias.categorias.filter((c) => !c.agrupadora)
    const peso = (c: Categoria) => (c.natureza === natureza ? 0 : 2) + (c.ativa ? 0 : 1)
    return [...analiticas].sort((a, b) => peso(a) - peso(b) || a.descricao.localeCompare(b.descricao))
  }, [categorias, natureza])

  async function salvar() {
    const centavos = centavosDeTexto(valor)
    if (!descricao.trim()) return setErro('Descreva o lançamento.')
    if (centavos === null) return setErro('Valor inválido — use vírgula para centavos (ex.: 1.234,56).')
    if (!categoria) return setErro('Escolha a categoria do plano.')
    if (!origem.trim()) return setErro('Informe a origem (plataforma).')
    // Prevenção de registro duplicado (report 03/08): confirma, nunca bloqueia — o
    // casamento manual×ERP é heurístico (valor+natureza em ±3 dias, sem chave comum).
    const suspeitas = suspeitasDoLancamento(
      { dataIso: data, valorCentavos: centavos, natureza: natureza === 'receita' ? 'R' : 'P', ignorarId: original?.id },
      movimentos,
    )
    if (suspeitas.length > 0) {
      const manuais = suspeitas.filter((s) => s.tipo === 'manual').length
      const erp = suspeitas.length - manuais
      const partes = [
        manuais > 0 ? `${manuais} lançamento(s) manual(is) com a MESMA data, valor e natureza` : '',
        erp > 0 ? `${erp} movimento(s) do ERP com o mesmo valor e natureza em ±3 dias (possível repasse já sincronizado)` : '',
      ].filter(Boolean)
      if (!window.confirm(`Possível duplicata: ${partes.join(' e ')}. A receita/despesa contaria em dobro. Lançar mesmo assim?`)) return
    }
    const dados: NovoLancamento = {
      data,
      descricao: descricao.trim(),
      valorCentavos: centavos,
      natureza,
      categoria,
      origem: origem.trim().toUpperCase(),
      observacao: observacao.trim(),
    }
    setSalvando(true)
    setErro('')
    try {
      if (original) await atualizar(original.id, dados)
      else await criar(dados)
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
      setSalvando(false)
    }
  }

  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div className="anim-pop flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-card border border-bd bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{original ? 'Editar lançamento' : 'Novo lançamento manual'}</h2>

        <Segmento
          opcoes={NATUREZAS}
          valor={natureza}
          onTrocar={(n) => {
            setNatureza(n)
            setCategoria('') // categoria da natureza anterior não vale mais
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Data">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CLASSE_INPUT} />
          </Campo>
          <Campo rotulo="Valor (R$)">
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="1.234,56"
              className={`${CLASSE_INPUT} text-right tabular-nums`}
            />
          </Campo>
        </div>

        <Campo rotulo="Descrição">
          <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Vendas iFood — semana 28" autoFocus className={CLASSE_INPUT} />
        </Campo>

        <Campo rotulo="Origem (plataforma)">
          <input type="text" list="origens-sugeridas" value={origem} onChange={(e) => setOrigem(e.target.value)} className={CLASSE_INPUT} />
          <datalist id="origens-sugeridas">
            {ORIGENS_SUGERIDAS.map((o) => <option key={o} value={o} />)}
          </datalist>
        </Campo>

        <Campo rotulo="Categoria do plano (todas — inativas e outras naturezas sinalizadas)">
          <SeletorCategoria opcoes={opcoesCategoria} valor={categoria} onEscolher={setCategoria} naturezaAtual={natureza} />
        </Campo>

        <Campo rotulo="Observação (opcional)">
          <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} className={CLASSE_INPUT} />
        </Campo>

        <p className="rounded-lg bg-warn/10 px-3 py-2 text-[11.5px] leading-relaxed text-warn">
          Repasse da plataforma que cair na conta bancária depois entra pelo ERP — não lance o
          repasse de novo aqui, senão a receita conta duas vezes.
        </p>

        {erro ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">{erro}</p> : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="rounded-lg border border-bd px-4 py-2 text-sm text-muted hover:text-text">Cancelar</button>
          <button type="button" onClick={() => void salvar()} disabled={salvando} className="fx-press rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {salvando ? 'Salvando…' : original ? 'Salvar' : 'Lançar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Combobox de categoria com BUSCA (report 03/08): o <select> nativo com centenas de itens
 * estourava o layout (o navegador desenha o popup onde quer, sem filtro). Lista TODAS as
 * analíticas: inativa ganha etiqueta, natureza diferente da declarada ganha pill — o
 * operador vê tudo e decide, nada é escondido.
 */
function SeletorCategoria({
  opcoes,
  valor,
  onEscolher,
  naturezaAtual,
}: {
  opcoes: readonly Categoria[]
  valor: string
  onEscolher: (codigo: string) => void
  naturezaAtual: NaturezaManual
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const escolhida = opcoes.find((c) => c.codigo === valor)

  const visiveis = useMemo(() => {
    const q = normalizarTexto(busca)
    const qCodigo = busca.trim().toLowerCase()
    if (!q && !qCodigo) return opcoes
    return opcoes.filter(
      (c) =>
        (qCodigo !== '' && c.codigo.toLowerCase().includes(qCodigo)) ||
        (q !== '' && normalizarTexto(c.descricao).includes(q)),
    )
  }, [opcoes, busca])

  function escolher(codigo: string) {
    onEscolher(codigo)
    setAberto(false)
    setBusca('')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`${CLASSE_INPUT} flex w-full items-center justify-between gap-2 text-left`}
      >
        {escolhida ? (
          <span className="flex min-w-0 items-center gap-1.5">
            {codigoExibivel(escolhida.codigo) ? (
              <span className="font-mono text-xs text-muted">{escolhida.codigo}</span>
            ) : null}
            <span className="truncate">{rotuloCategoria(escolhida.codigo, escolhida.descricao)}</span>
            {escolhida.ativa === false ? <EtiquetaEstado estado="inativo" /> : null}
          </span>
        ) : (
          <span className="text-muted">— escolher —</span>
        )}
        <span className="text-xs text-muted">▾</span>
      </button>
      {aberto ? (
        <>
          {/* Backdrop local: clique-fora fecha só o dropdown (o modal continua). */}
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} aria-hidden />
          <div className="absolute left-0 right-0 z-20 mt-1 flex flex-col overflow-hidden rounded-lg border border-bd bg-surface shadow-brand">
            <div className="border-b border-bd p-2">
              <CampoBusca valor={busca} onValor={setBusca} placeholder="Buscar categoria…" visiveis={visiveis.length} total={opcoes.length} />
            </div>
            <ul className="max-h-64 overflow-auto p-1">
              {visiveis.map((c) => (
                <li key={c.codigo}>
                  <button
                    type="button"
                    onClick={() => escolher(c.codigo)}
                    className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-sm ${
                      c.codigo === valor ? 'bg-primary/15 text-text' : 'hover:bg-surface2'
                    }`}
                  >
                    {codigoExibivel(c.codigo) ? <span className="shrink-0 font-mono text-xs text-muted">{c.codigo}</span> : null}
                    <span className="min-w-0 flex-1 truncate">{rotuloCategoria(c.codigo, c.descricao)}</span>
                    {c.natureza !== naturezaAtual ? (
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${COR_NATUREZA[c.natureza]}`}>
                        {ROTULO_NATUREZA[c.natureza]}
                      </span>
                    ) : null}
                    {c.ativa === false ? <EtiquetaEstado estado="inativo" /> : null}
                  </button>
                </li>
              ))}
              {visiveis.length === 0 ? <li className="px-2.5 py-2 text-sm text-muted">Nenhuma categoria casa com a busca.</li> : null}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{rotulo}</span>
      {children}
    </label>
  )
}
