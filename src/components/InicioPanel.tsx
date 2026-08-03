/**
 * @file Início — a caixa de entrada do operador (P1 do PLANO_UX_CLEAN).
 * Uma tela que responde "onde tem trabalho HOJE?" sem abrir 3 abas: aprovações
 * aguardando (todos os clientes), idade da sincronização (todos) e as pendências de
 * classificação do cliente ativo. Cada linha leva direto à ação (troca cliente + aba).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { gruposDuplicados, type MembroDuplicata } from '@/core/duplicatas'
import { chaveContraparte } from '@/core/movimento'
import { orfasDaConciliacao } from '@/core/orfaos'
import { useCadastros } from '@/lib/cadastros'
import { useClientes } from '@/lib/clientes'
import { useDuplicatasIgnoradas } from '@/lib/duplicatasDoc'
import { useModelo } from '@/lib/useModelo'
import { useMovimentos } from '@/lib/movimentos'
import { useOverrides } from '@/lib/overrides'
import { supabase } from '@/lib/supabase'

/** O painel não conhece o setAba do Shell — o pedido de navegação vai por evento. */
export function irParaAba(aba: string) {
  window.dispatchEvent(new CustomEvent('lf-ir-aba', { detail: aba }))
}

interface PendenciaAprovacao {
  readonly clienteId: string
  readonly pendentes: number
  readonly aAgendar: number
}

interface SyncCliente {
  readonly clienteId: string
  readonly atualizadoEm: string | null
}

const dias = (iso: string | null): number | null =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null

export function InicioPanel() {
  const { clientes, ativo, selecionar } = useClientes()
  const { modelo } = useModelo()
  const { categorias: cad } = useCadastros()
  const { movimentos } = useMovimentos()
  const [aprov, setAprov] = useState<readonly PendenciaAprovacao[]>([])
  const [syncs, setSyncs] = useState<readonly SyncCliente[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    if (!supabase) return setCarregando(false)
    const [a, s] = await Promise.all([
      supabase.from('painel_aprovacoes').select('cliente_id, status').in('status', ['pendente', 'aprovada']),
      supabase.from('painel_estado').select('chave, atualizado_em').like('chave', '%:movimentos-raw'),
    ])
    const porCliente = new Map<string, { pendentes: number; aAgendar: number }>()
    for (const r of a.data ?? []) {
      const atual = porCliente.get(r.cliente_id) ?? { pendentes: 0, aAgendar: 0 }
      if (r.status === 'pendente') atual.pendentes++
      else atual.aAgendar++
      porCliente.set(r.cliente_id, atual)
    }
    setAprov([...porCliente].map(([clienteId, v]) => ({ clienteId, ...v })))
    setSyncs(
      (s.data ?? []).map((r) => ({
        clienteId: r.chave.slice('cliente:'.length, -':movimentos-raw'.length),
        atualizadoEm: r.atualizado_em ?? null,
      })),
    )
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const nomeDe = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes])
  const orfas = useMemo(() => orfasDaConciliacao(modelo, cad.categorias, movimentos), [modelo, cad.categorias, movimentos])

  // Duplicidades do CLIENTE ATIVO (só ele tem movimentos carregados — varrer todos exigiria
  // contagem pré-computada por sync). Mesmo detector da aba Contrapartes.
  const { resolvedor } = useOverrides()
  const { ignoradas } = useDuplicatasIgnoradas()
  const duplicidades = useMemo(() => {
    const acc = new Map<string, { total: number; qtd: number }>()
    for (const m of movimentos) {
      const codigo = chaveContraparte(m)
      const atual = acc.get(codigo) ?? { total: 0, qtd: 0 }
      atual.total += m.valorCentavos
      atual.qtd += 1
      acc.set(codigo, atual)
    }
    const membros: MembroDuplicata[] = [...acc.entries()].map(([codigo, v]) => {
      const r = resolvedor.contraparte(codigo)
      return { codigo, nome: r.nome, estado: r.estado, totalCentavos: v.total, qtd: v.qtd }
    })
    return gruposDuplicados(membros, ignoradas)
  }, [movimentos, resolvedor, ignoradas])
  const syncsOrdenados = useMemo(
    () =>
      [...syncs]
        .filter((s) => nomeDe.has(s.clienteId))
        .sort((x, y) => (x.atualizadoEm ?? '').localeCompare(y.atualizadoEm ?? '')),
    [syncs, nomeDe],
  )

  function abrirCliente(clienteId: string, aba: string) {
    if (clienteId !== ativo.id) selecionar(clienteId)
    irParaAba(aba)
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[19px] font-semibold">Início</h1>
        <p className="text-sm text-muted">Onde tem trabalho hoje — em todos os clientes, sem caçar aba por aba.</p>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-card border border-bd bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Aprovações de pagamento</h2>
          {carregando ? (
            <p className="text-sm text-muted">Carregando…</p>
          ) : aprov.length === 0 ? (
            <p className="rounded-lg border border-dashed border-bd p-4 text-center text-sm text-muted">
              Nenhuma conta aguardando em nenhum cliente.
            </p>
          ) : (
            aprov
              .filter((p) => nomeDe.has(p.clienteId))
              .map((p) => (
                <button
                  key={p.clienteId}
                  type="button"
                  onClick={() => abrirCliente(p.clienteId, 'aprovacoes')}
                  className="flex items-center justify-between gap-3 rounded-lg border border-bd bg-surface2/60 px-4 py-2.5 text-left hover:border-primary"
                >
                  <span className="truncate text-sm font-medium">{nomeDe.get(p.clienteId)}</span>
                  <span className="flex shrink-0 gap-2 text-xs">
                    {p.pendentes ? (
                      <span className="rounded-full bg-warn/15 px-2 py-0.5 font-semibold text-warn">{p.pendentes} aguardando cliente</span>
                    ) : null}
                    {p.aAgendar ? (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold text-accent">{p.aAgendar} a agendar</span>
                    ) : null}
                  </span>
                </button>
              ))
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-card border border-bd bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Sincronização (mais antigas primeiro)</h2>
          {carregando ? (
            <p className="text-sm text-muted">Carregando…</p>
          ) : (
            syncsOrdenados.slice(0, 10).map((s) => {
              const d = dias(s.atualizadoEm)
              const velho = d === null || d >= 3
              return (
                <button
                  key={s.clienteId}
                  type="button"
                  onClick={() => abrirCliente(s.clienteId, 'plano')}
                  className="flex items-center justify-between gap-3 rounded-lg border border-bd bg-surface2/60 px-4 py-2.5 text-left hover:border-primary"
                >
                  <span className="truncate text-sm font-medium">{nomeDe.get(s.clienteId)}</span>
                  <span className={`shrink-0 text-xs font-medium ${velho ? 'text-warn' : 'text-muted'}`}>
                    {d === null ? 'nunca sincronizou' : d === 0 ? 'hoje' : `há ${d} dia${d === 1 ? '' : 's'}`}
                  </span>
                </button>
              )
            })
          )}
        </section>
      </div>

      <section className="flex flex-col gap-2 rounded-card border border-bd bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Duplicidades · {ativo.nome}</h2>
        {duplicidades.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma contraparte com nome duplicado no cliente ativo. ✓</p>
        ) : (
          <button
            type="button"
            onClick={() => irParaAba('fornecedores')}
            className="flex items-center justify-between gap-3 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-left"
          >
            <span className="text-sm font-medium text-warn">
              {duplicidades.length} grupo(s) de cadastros com o mesmo nome — possível duplicata do ERP
            </span>
            <span className="shrink-0 text-xs text-warn">revisar em Contrapartes →</span>
          </button>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-card border border-bd bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Classificação · {ativo.nome}</h2>
        {orfas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma órfã na conciliação do cliente ativo. ✓</p>
        ) : (
          <button
            type="button"
            onClick={() => irParaAba('modelo')}
            className="flex items-center justify-between gap-3 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-left"
          >
            <span className="text-sm font-medium text-warn">
              {orfas.length} classificação(ões) órfã(s) — categorias que sumiram da estrutura
            </span>
            <span className="text-xs text-warn">resolver na Matriz →</span>
          </button>
        )}
      </section>
    </div>
  )
}
