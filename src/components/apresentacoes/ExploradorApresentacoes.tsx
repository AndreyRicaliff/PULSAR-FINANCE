/**
 * @file Apresentações como EXPLORADOR DE ARQUIVOS: cards visuais em colunas kanban por
 * status, ordenação, arrasto rascunho→arquivada, e o editor de roteiro embutido.
 * Movimentos legais espelham o trigger do banco: publicada é imutável (só → arquivada)
 * e NADA volta a rascunho — o kanban não oferece arrasto que o banco recusaria.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApresentacao } from '@/lib/useApresentacao'
import { useClientes } from '@/lib/clientes'
import { supabase } from '@/lib/supabase'
import { RelatorioApresentacao } from '../relatorios/RelatorioApresentacao.tsx'
import { Segmento, type OpcaoSeg } from '../Segmento.tsx'

interface Item {
  readonly id: string
  readonly titulo: string
  readonly competencia: string
  readonly status: 'rascunho' | 'publicada' | 'arquivada'
  readonly atualizado_em: string | null
  readonly criado_em: string
  readonly conteudo: {
    readonly periodo?: { readonly de: string | null; readonly ate: string | null }
    readonly roteiro?: readonly unknown[]
    readonly capa?: { readonly subtitulo?: string }
  } | null
}

type Ordem = 'recentes' | 'nome' | 'competencia'
const ORDENS: readonly OpcaoSeg<Ordem>[] = [
  { id: 'recentes', rotulo: 'Recentes' },
  { id: 'nome', rotulo: 'A–Z' },
  { id: 'competencia', rotulo: 'Competência' },
]

const dataBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'

const mesLegivel = (aaaaMm: string) => {
  const [a, m] = aaaaMm.split('-')
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return a && m ? `${nomes[Number(m) - 1] ?? m}/${a.slice(2)}` : aaaaMm
}

const faixaLegivel = (p?: { de: string | null; ate: string | null } | null) =>
  p?.de || p?.ate ? `${p?.de ? mesLegivel(p.de.slice(0, 7)) : '…'} → ${p?.ate ? mesLegivel(p.ate.slice(0, 7)) : '…'}` : 'todo o histórico'

export function ExploradorApresentacoes() {
  const { ativo } = useClientes()
  const apre = useApresentacao()
  const [itens, setItens] = useState<readonly Item[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [erro, setErro] = useState('')
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [abertaTitulo, setAbertaTitulo] = useState('')
  const [editando, setEditando] = useState(false)

  const carregar = useCallback(async () => {
    if (!supabase) return setCarregando(false)
    const { data, error } = await supabase
      .from('painel_apresentacoes')
      .select('id, titulo, competencia, status, atualizado_em, criado_em, conteudo')
      .eq('cliente_id', ativo.id)
      .order('atualizado_em', { ascending: false, nullsFirst: false })
    if (error) setErro(error.message)
    else setItens((data ?? []) as Item[])
    setCarregando(false)
  }, [ativo.id])

  useEffect(() => {
    setItens([])
    setCarregando(true)
    setAbertaId(null)
    setEditando(false)
    void carregar()
  }, [carregar])

  const ordenar = useCallback(
    (xs: readonly Item[]) => {
      const c = [...xs]
      if (ordem === 'nome') c.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
      else if (ordem === 'competencia') c.sort((a, b) => b.competencia.localeCompare(a.competencia))
      else c.sort((a, b) => (b.atualizado_em ?? b.criado_em).localeCompare(a.atualizado_em ?? a.criado_em))
      return c
    },
    [ordem],
  )

  const colunas = useMemo(
    () => ({
      rascunho: ordenar(itens.filter((i) => i.status === 'rascunho')),
      publicada: ordenar(itens.filter((i) => i.status === 'publicada')),
      arquivada: ordenar(itens.filter((i) => i.status === 'arquivada')),
    }),
    [itens, ordenar],
  )

  async function abrir(item: Item, editar: boolean) {
    if (!supabase) return
    setErro('')
    const { data, error } = await supabase.from('painel_apresentacoes').select('conteudo').eq('id', item.id).single()
    if (error) return setErro(error.message)
    apre.substituir(data.conteudo)
    setAbertaId(item.id)
    setAbertaTitulo(item.titulo)
    if (editar) setEditando(true)
  }

  async function novaApresentacao() {
    if (!supabase) return
    const titulo = window.prompt('Nome da nova apresentação:', `Fechamento ${mesLegivel(new Date().toISOString().slice(0, 7))}`)
    if (!titulo?.trim()) return
    setErro('')
    const { data, error } = await supabase
      .from('painel_apresentacoes')
      .insert({ cliente_id: ativo.id, competencia: new Date().toISOString().slice(0, 7), titulo: titulo.trim(), status: 'rascunho', conteudo: {}, numeros: {} })
      .select('id')
      .single()
    if (error) return setErro(error.message)
    apre.substituir({})
    setAbertaId(data.id)
    setAbertaTitulo(titulo.trim())
    setEditando(true)
  }

  async function salvarNaAberta() {
    if (!supabase || !abertaId) return
    setErro('')
    const { error } = await supabase
      .from('painel_apresentacoes')
      .update({ conteudo: apre.estado, atualizado_em: new Date().toISOString() })
      .eq('id', abertaId)
      .eq('status', 'rascunho')
    if (error) setErro(error.message)
    await carregar()
  }

  async function arquivar(id: string) {
    if (!supabase) return
    setErro('')
    const { error } = await supabase.from('painel_apresentacoes').update({ status: 'arquivada' }).eq('id', id)
    if (error) setErro(error.message)
    await carregar()
  }

  async function excluir(item: Item) {
    if (!supabase || item.status === 'publicada') return
    if (!window.confirm(`Excluir "${item.titulo}"? Não há desfazer.`)) return
    const { error } = await supabase.from('painel_apresentacoes').delete().eq('id', item.id)
    if (error) return setErro(error.message)
    if (item.id === abertaId) setAbertaId(null)
    await carregar()
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-bd bg-surface px-4 py-3">
          <button type="button" onClick={() => setEditando(false)} className="fx-press rounded-lg border border-bd px-3 py-1.5 text-sm text-muted hover:text-text">
            ← Apresentações
          </button>
          <p className="min-w-0 flex-1 truncate text-sm">
            Editando: <strong>{abertaTitulo || 'roteiro avulso'}</strong>
          </p>
          {abertaId ? (
            <button type="button" onClick={() => void salvarNaAberta()} className="fx-press rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white">
              Salvar nesta apresentação
            </button>
          ) : null}
          {erro ? <p className="w-full text-[13px] text-danger">{erro}</p> : null}
        </div>
        <RelatorioApresentacao />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold">Apresentações</h1>
          <p className="text-sm text-muted">
            Os relatórios de {ativo.nome} como arquivos — abra, edite, arquive. Publicada é registro imutável.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Segmento opcoes={ORDENS} valor={ordem} onTrocar={setOrdem} />
          <button type="button" onClick={() => void novaApresentacao()} className="fx-press rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
            + Nova
          </button>
        </div>
      </header>
      {erro ? <p className="rounded-card border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{erro}</p> : null}

      {carregando ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <Coluna
            titulo="Em preparação"
            itens={colunas.rascunho}
            aceitaDrop={false}
            onAbrir={abrir}
            onExcluir={excluir}
            vazio="Nenhum rascunho — crie em + Nova."
          />
          <Coluna titulo="Publicadas" itens={colunas.publicada} aceitaDrop={false} onAbrir={abrir} onExcluir={excluir} vazio="Nada publicado ainda." />
          <Coluna
            titulo="Arquivadas"
            itens={colunas.arquivada}
            aceitaDrop
            onDrop={(id) => void arquivar(id)}
            onAbrir={abrir}
            onExcluir={excluir}
            vazio="Arraste um rascunho para cá para arquivar."
          />
        </div>
      )}
    </div>
  )
}

function Coluna({
  titulo,
  itens,
  aceitaDrop,
  onDrop,
  onAbrir,
  onExcluir,
  vazio,
}: {
  titulo: string
  itens: readonly Item[]
  aceitaDrop: boolean
  onDrop?: (id: string) => void
  onAbrir: (i: Item, editar: boolean) => Promise<void>
  onExcluir: (i: Item) => Promise<void>
  vazio: string
}) {
  const [sobre, setSobre] = useState(false)
  return (
    <section
      onDragOver={aceitaDrop ? (e) => { e.preventDefault(); setSobre(true) } : undefined}
      onDragLeave={aceitaDrop ? () => setSobre(false) : undefined}
      onDrop={
        aceitaDrop
          ? (e) => {
              e.preventDefault()
              setSobre(false)
              const id = e.dataTransfer.getData('text/plain')
              if (id) onDrop?.(id)
            }
          : undefined
      }
      className={`flex flex-col gap-3 rounded-card border p-4 transition-colors ${sobre ? 'border-primary bg-primary/5' : 'border-bd bg-surface'}`}
    >
      <h2 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
        {titulo}
        <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px]">{itens.length}</span>
      </h2>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-bd p-5 text-center text-xs text-muted">{vazio}</p>
      ) : (
        itens.map((i) => <Cartao key={i.id} item={i} onAbrir={onAbrir} onExcluir={onExcluir} />)
      )}
    </section>
  )
}

function Cartao({ item, onAbrir, onExcluir }: { item: Item; onAbrir: (i: Item, editar: boolean) => Promise<void>; onExcluir: (i: Item) => Promise<void> }) {
  const slides = item.conteudo?.roteiro?.length ?? 0
  const arrastavel = item.status === 'rascunho'
  return (
    <article
      draggable={arrastavel}
      onDragStart={arrastavel ? (e) => e.dataTransfer.setData('text/plain', item.id) : undefined}
      className={`card-hover group overflow-hidden rounded-card border border-bd bg-surface2/60 ${arrastavel ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* mini-capa: o "ícone de arquivo" do explorador */}
      <button type="button" onClick={() => void onAbrir(item, true)} className="block w-full text-left">
        <div className="relative h-16 bg-[image:var(--grad-pulse)] opacity-90">
          <span className="absolute bottom-2 left-3 text-[11px] font-bold uppercase tracking-wider text-white/90">
            {mesLegivel(item.competencia)}
          </span>
          <span className="absolute right-3 top-2 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-white/90">
            {slides} slide{slides === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2.5">
          <p className="truncate text-sm font-semibold">{item.titulo}</p>
          <p className="text-[11px] text-muted">
            dados: {mesLegivel(item.competencia)} · período: {faixaLegivel(item.conteudo?.periodo)}
          </p>
          <p className="text-[11px] text-muted">editada em {dataBr(item.atualizado_em ?? item.criado_em)}</p>
        </div>
      </button>
      <div className="flex items-center gap-2 border-t border-bd/60 px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={() => void onAbrir(item, true)} className="text-xs font-medium text-secondary hover:underline">
          Abrir e editar
        </button>
        {item.status !== 'publicada' ? (
          <button type="button" onClick={() => void onExcluir(item)} className="ml-auto text-xs text-muted hover:text-danger">
            Excluir
          </button>
        ) : null}
      </div>
    </article>
  )
}
