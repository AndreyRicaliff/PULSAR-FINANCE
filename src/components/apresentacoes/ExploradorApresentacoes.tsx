/**
 * @file Apresentações como EXPLORADOR DE ARQUIVOS: cards visuais em colunas kanban por
 * status, ordenação, arrasto rascunho→arquivada, e o editor de roteiro embutido.
 * Movimentos legais espelham o trigger do banco: publicada é imutável (só → arquivada)
 * e NADA volta a rascunho — o kanban não oferece arrasto que o banco recusaria.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hojeLocalIso } from '@/core/periodo'
import { estadoInicialApresentacao, useApresentacao } from '@/lib/useApresentacao'
import { useClientes } from '@/lib/clientes'
import { supabase } from '@/lib/supabase'
import { RelatorioApresentacao } from '../relatorios/RelatorioApresentacao.tsx'
import { temaPorId } from '@/core/temaApresentacao'
import { useFicha } from '@/lib/ficha'
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
    readonly tema?: string | null
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

/**
 * Competência = mês dos DADOS, não o dia da criação. Fechamento de julho montado em agosto
 * nascia carimbado 'ago' e o card mentia ("dados: ago/26"). hojeLocalIso, não toISOString:
 * em UTC o último dia do mês vira o mês seguinte depois das 21h (mesma armadilha do #68).
 */
const competenciaDe = (periodo?: { de: string | null; ate: string | null }): string =>
  periodo?.ate?.slice(0, 7) ?? periodo?.de?.slice(0, 7) ?? hojeLocalIso().slice(0, 7)

/**
 * 23505 = unique_violation. A única unique da tabela é (cliente_id, competencia, versao) e o
 * trigger de 06/08 numera a versão sozinho — se ainda estourar aqui é corrida de duas abas,
 * não duplicata de verdade. O texto cru do Postgres assustava o financeiro sem dizer o que fazer.
 */
const mensagemDeErro = (e: { code?: string; message: string }): string =>
  e.code === '23505'
    ? 'Outra aba criou uma apresentação para este mês ao mesmo tempo. Tente de novo — o número da versão é atribuído automaticamente.'
    : e.message

export function ExploradorApresentacoes() {
  const { ativo } = useClientes()
  const apre = useApresentacao()
  const [itens, setItens] = useState<readonly Item[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [erro, setErro] = useState('')
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [abertaTitulo, setAbertaTitulo] = useState('')
  const [abertaStatus, setAbertaStatus] = useState<Item['status']>('rascunho')
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

  /** O roteiro de trabalho é UM por cliente — trocar o que está nele sempre pede confirmação. */
  function confirmarTroca(destino: string): boolean {
    if (!abertaId) return true
    return window.confirm(
      `${destino} substitui o roteiro em edição${abertaTitulo ? ` ("${abertaTitulo}")` : ''}. Alterações não salvas lá se perdem. Continuar?`,
    )
  }

  async function abrir(item: Item, editar: boolean) {
    if (!supabase) return
    // Sem esta confirmação, editar A e abrir B perdia a edição em silêncio.
    if (abertaId !== item.id && !confirmarTroca(`Abrir "${item.titulo}"`)) return
    setErro('')
    const { data, error } = await supabase.from('painel_apresentacoes').select('conteudo').eq('id', item.id).single()
    if (error) return setErro(error.message)
    apre.substituir(data.conteudo)
    setAbertaId(item.id)
    setAbertaTitulo(item.titulo)
    setAbertaStatus(item.status)
    if (editar) setEditando(true)
  }

  async function novaApresentacao() {
    if (!supabase) return
    if (!confirmarTroca('Criar uma apresentação nova')) return
    const competencia = competenciaDe()
    const titulo = window.prompt('Nome da nova apresentação:', `Fechamento ${mesLegivel(competencia)}`)
    if (!titulo?.trim()) return
    setErro('')
    // Grava o roteiro padrão, não `{}`: criada e fechada sem salvar, ficava vazia no banco.
    const inicial = estadoInicialApresentacao()
    const { data, error } = await supabase
      .from('painel_apresentacoes')
      .insert({ cliente_id: ativo.id, competencia, titulo: titulo.trim(), status: 'rascunho', conteudo: inicial, numeros: {} })
      .select('id')
      .single()
    if (error) return setErro(mensagemDeErro(error))
    apre.substituir(inicial)
    setAbertaId(data.id)
    setAbertaTitulo(titulo.trim())
    setAbertaStatus('rascunho')
    setEditando(true)
    await carregar()
  }

  async function salvarNaAberta() {
    if (!supabase || !abertaId) return
    setErro('')
    // .select() no update: sem ele, salvar numa apresentação que não é mais rascunho
    // afetava 0 linhas SEM erro — o financeiro achava que salvou e nada foi gravado.
    const { data, error } = await supabase
      .from('painel_apresentacoes')
      .update({ conteudo: apre.estado, competencia: competenciaDe(apre.estado.periodo), atualizado_em: new Date().toISOString() })
      .eq('id', abertaId)
      .eq('status', 'rascunho')
      .select('id')
    if (error) return setErro(mensagemDeErro(error))
    if (!data?.length) return setErro('Nada gravado — esta apresentação não é mais rascunho. Use "Salvar como nova".')
    await carregar()
  }

  async function salvarComoNova() {
    if (!supabase) return
    const titulo = window.prompt('Salvar o roteiro atual como nova apresentação:', `${abertaTitulo || 'Apresentação'} (cópia)`)
    if (!titulo?.trim()) return
    setErro('')
    const { data, error } = await supabase
      .from('painel_apresentacoes')
      .insert({ cliente_id: ativo.id, competencia: competenciaDe(apre.estado.periodo), titulo: titulo.trim(), status: 'rascunho', conteudo: apre.estado, numeros: {} })
      .select('id')
      .single()
    if (error) return setErro(mensagemDeErro(error))
    setAbertaId(data.id)
    setAbertaTitulo(titulo.trim())
    setAbertaStatus('rascunho')
    await carregar()
  }

  async function arquivar(id: string) {
    if (!supabase) return
    setErro('')
    const { error } = await supabase.from('painel_apresentacoes').update({ status: 'arquivada' }).eq('id', id)
    if (error) setErro(error.message)
    await carregar()
  }

  async function publicar(item: Item) {
    if (!supabase || item.status !== 'rascunho') return
    setErro('')
    // Guard pedido (2026-08-02): publicar "compartilha com a conta do cliente" — se o
    // cliente NÃO TEM conta criada, isso precisa aparecer, não falhar em silêncio.
    const { data: contas, error: eConta } = await supabase
      .from('painel_acessos')
      .select('id')
      .eq('cliente_id', ativo.id)
      .eq('papel', 'cliente')
      .limit(1)
    if (eConta) return setErro(eConta.message)
    if (!contas?.length) {
      const segue = window.confirm(
        `${ativo.nome} ainda NÃO TEM CONTA CRIADA — a apresentação ficará publicada, mas o cliente não consegue vê-la até você convidar (aba Acessos → Convidar por e-mail). Publicar mesmo assim?`,
      )
      if (!segue) return
    } else if (!window.confirm(`Publicar "${item.titulo}" (${mesLegivel(item.competencia)})? O conteúdo congela — corrigir depois é publicar uma nova versão.`)) {
      return
    }
    const { error } = await supabase
      .from('painel_apresentacoes')
      .update({ status: 'publicada', publicado_em: new Date().toISOString() })
      .eq('id', item.id)
    if (error) {
      return setErro(
        /unique|duplicate/i.test(error.message)
          ? `Já existe uma publicada de ${mesLegivel(item.competencia)} — arquive-a antes de publicar outra do mesmo mês.`
          : error.message,
      )
    }
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
          {abertaId && abertaStatus === 'rascunho' ? (
            <button type="button" onClick={() => void salvarNaAberta()} className="fx-press rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white">
              Salvar nesta apresentação
            </button>
          ) : (
            <>
              {abertaId ? (
                <span className="rounded-full bg-warn/15 px-2.5 py-1 text-xs font-medium text-warn">
                  {abertaStatus} — não editável
                </span>
              ) : null}
              <button type="button" onClick={() => void salvarComoNova()} className="fx-press rounded-lg border border-bd px-4 py-1.5 text-sm font-medium text-muted hover:text-text">
                Salvar como nova…
              </button>
            </>
          )}
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
            onPublicar={publicar}
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
  onPublicar,
  vazio,
}: {
  titulo: string
  itens: readonly Item[]
  aceitaDrop: boolean
  onDrop?: (id: string) => void
  onAbrir: (i: Item, editar: boolean) => Promise<void>
  onExcluir: (i: Item) => Promise<void>
  onPublicar?: (i: Item) => Promise<void>
  vazio: string
}) {
  const [sobre, setSobre] = useState(false)
  return (
    <section
      onDragOver={aceitaDrop ? (e) => { e.preventDefault(); setSobre(true) } : undefined}
      onDragLeave={
        aceitaDrop
          ? (e) => {
              // dragLeave dispara ao passar sobre FILHOS da coluna — sem este guard o
              // highlight piscava a cada card atravessado.
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(false)
            }
          : undefined
      }
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
        itens.map((i) => <Cartao key={i.id} item={i} onAbrir={onAbrir} onExcluir={onExcluir} onPublicar={onPublicar} />)
      )}
    </section>
  )
}

function Cartao({
  item,
  onAbrir,
  onExcluir,
  onPublicar,
}: {
  item: Item
  onAbrir: (i: Item, editar: boolean) => Promise<void>
  onExcluir: (i: Item) => Promise<void>
  onPublicar?: (i: Item) => Promise<void>
}) {
  const { ficha } = useFicha()
  const tema = temaPorId(item.conteudo?.tema ?? ficha.temaPadrao, ficha.temasCustom)
  const slides = item.conteudo?.roteiro?.length ?? 0
  const arrastavel = item.status === 'rascunho'
  return (
    <article className="card-hover group overflow-hidden rounded-card border border-bd bg-surface2/60">
      {/* mini-capa: o "ícone de arquivo" do explorador. O card NÃO é draggable — clique
          e arrasto brigavam (abrir acidental no drop); só a alça ⠿ arrasta, mesmo padrão
          já validado na conciliação. */}
      <button type="button" onClick={() => void onAbrir(item, true)} className="block w-full text-left">
        <div
          className="relative h-16 opacity-95"
          style={{ background: `linear-gradient(135deg, ${tema.escuro}, ${tema.acento})` }}
        >
          {arrastavel ? (
            <span
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
              onClick={(e) => e.stopPropagation()}
              title="Arraste para Arquivadas"
              className="absolute left-2 top-1.5 cursor-grab rounded bg-black/30 px-1.5 py-0.5 text-[13px] text-white/80 active:cursor-grabbing"
              aria-hidden
            >
              ⠿
            </span>
          ) : null}
          <span className="absolute bottom-2 left-3 text-[11px] font-bold uppercase tracking-wider text-white/90">
            {mesLegivel(item.competencia)}
          </span>
          <span className="absolute right-3 top-2 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-white/90">
            {item.conteudo?.roteiro ? `${slides} slide${slides === 1 ? '' : 's'}` : 'nova'}
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
        {onPublicar && item.status === 'rascunho' ? (
          <button type="button" onClick={() => void onPublicar(item)} className="text-xs font-medium text-accent hover:underline">
            Publicar
          </button>
        ) : null}
        {item.status !== 'publicada' ? (
          <button type="button" onClick={() => void onExcluir(item)} className="ml-auto text-xs text-muted hover:text-danger">
            Excluir
          </button>
        ) : null}
      </div>
    </article>
  )
}
