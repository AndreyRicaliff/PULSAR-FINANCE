/**
 * @file Biblioteca de apresentações do cliente ativo — o roteiro deixa de ser um rascunho
 * único e bruto: cada apresentação vira um ARQUIVO nomeado (salvar / abrir / excluir).
 * Publicada é imutável por trigger no banco; aqui só se mexe em rascunho.
 */
import { useCallback, useEffect, useState } from 'react'
import { useApresentacao } from '@/lib/useApresentacao'
import { useClientes } from '@/lib/clientes'
import { supabase } from '@/lib/supabase'

interface ItemBiblioteca {
  readonly id: string
  readonly titulo: string
  readonly competencia: string
  readonly status: string
  readonly atualizado_em: string | null
  readonly criado_em: string
}

const dataBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export function BibliotecaApresentacoes() {
  const { ativo } = useClientes()
  const apre = useApresentacao()
  const [itens, setItens] = useState<readonly ItemBiblioteca[]>([])
  const [aberta, setAberta] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [competencia, setCompetencia] = useState(() => new Date().toISOString().slice(0, 7))
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('painel_apresentacoes')
      .select('id, titulo, competencia, status, atualizado_em, criado_em')
      .eq('cliente_id', ativo.id)
      .order('criado_em', { ascending: false })
    if (error) return setErro(error.message)
    setItens((data ?? []) as ItemBiblioteca[])
  }, [ativo.id])

  useEffect(() => {
    setItens([])
    void carregar()
  }, [carregar])

  async function salvarAtual() {
    if (!supabase) return
    if (!titulo.trim()) return setErro('Dê um nome à apresentação.')
    setOcupado(true)
    setErro('')
    const { error } = await supabase.from('painel_apresentacoes').insert({
      cliente_id: ativo.id,
      competencia,
      titulo: titulo.trim(),
      status: 'rascunho',
      conteudo: apre.estado,
      numeros: {},
    })
    if (error) setErro(error.message)
    else {
      setTitulo('')
      await carregar()
    }
    setOcupado(false)
  }

  async function abrir(item: ItemBiblioteca) {
    if (!supabase) return
    if (!window.confirm(`Abrir "${item.titulo}" substitui o roteiro em edição. Continuar? (salve o atual antes, se importa)`)) return
    setErro('')
    const { data, error } = await supabase.from('painel_apresentacoes').select('conteudo').eq('id', item.id).single()
    if (error) return setErro(error.message)
    apre.substituir(data.conteudo)
  }

  async function excluir(item: ItemBiblioteca) {
    if (!supabase) return
    if (item.status !== 'rascunho') return setErro('Só rascunho pode ser excluído — publicada é registro.')
    if (!window.confirm(`Excluir o rascunho "${item.titulo}"? Não há desfazer.`)) return
    const { error } = await supabase.from('painel_apresentacoes').delete().eq('id', item.id)
    if (error) return setErro(error.message)
    await carregar()
  }

  return (
    <section className="rounded-card border border-bd bg-surface p-5">
      <button type="button" onClick={() => setAberta((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div>
          <h2 className="text-[15px] font-semibold">Biblioteca de apresentações</h2>
          <p className="text-xs text-muted">
            {itens.length} salva(s) deste cliente — o roteiro abaixo é o rascunho de trabalho; salve versões nomeadas aqui.
          </p>
        </div>
        <span className="text-xs text-muted">{aberta ? '▴ fechar' : '▾ abrir'}</span>
      </button>

      {aberta ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-40 flex-1 flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Nome</span>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Fechamento Junho/26"
                className="rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Competência</span>
              <input
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                className="rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void salvarAtual()}
              className="fx-press rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Salvar roteiro atual
            </button>
          </div>
          {erro ? <p className="text-[13px] text-danger">{erro}</p> : null}

          {itens.length === 0 ? (
            <p className="rounded-lg border border-dashed border-bd p-4 text-center text-sm text-muted">
              Nenhuma apresentação salva ainda para este cliente.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {itens.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-bd bg-surface2/60 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.titulo}</p>
                    <p className="text-[11px] text-muted">
                      {i.competencia} · {i.status} · salva em {dataBr(i.atualizado_em ?? i.criado_em)}
                    </p>
                  </div>
                  <button type="button" onClick={() => void abrir(i)} className="fx-press rounded-lg border border-bd px-3 py-1 text-xs text-muted hover:border-primary hover:text-text">
                    Abrir no roteiro
                  </button>
                  {i.status === 'rascunho' ? (
                    <button type="button" onClick={() => void excluir(i)} className="fx-press rounded-lg border border-bd px-3 py-1 text-xs text-muted hover:border-danger hover:text-danger">
                      Excluir
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}
