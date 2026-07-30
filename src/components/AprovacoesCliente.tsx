/**
 * @file Aprovações DENTRO da conta do cliente (vista do HUD).
 * O clique dele chama o MESMO RPC do operador (decidir_aprovacao valida sessão 2FA +
 * vínculo no servidor) — a trilha passa a registrar "Cliente aprovou", que é a prova
 * que a planilha nunca deu. Read-only do HUD tem esta exceção deliberada: decidir É o
 * ato do cliente.
 */
import { useMemo, useState } from 'react'
import { COR_STATUS, emAberto, ROTULO_EVENTO, ROTULO_STATUS, type Aprovacao, type EventoAprovacao } from '@/core/aprovacao'
import { useAprovacoes } from '@/lib/aprovacoes'
import { brl } from '@/lib/money'

const dataBr = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}
const quando = (ts: string) => {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function AprovacoesCliente() {
  const api = useAprovacoes()
  const [erro, setErro] = useState('')
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set())
  const pendentes = useMemo(() => api.aprovacoes.filter((a) => a.status === 'pendente'), [api.aprovacoes])
  const outras = useMemo(() => api.aprovacoes.filter((a) => a.status !== 'pendente' && emAberto(a)), [api.aprovacoes])
  const eventosPor = useMemo(() => {
    const m = new Map<string, EventoAprovacao[]>()
    for (const e of api.eventos) {
      const l = m.get(e.aprovacaoId) ?? []
      l.push(e)
      m.set(e.aprovacaoId, l)
    }
    return m
  }, [api.eventos])

  if (api.carregando) return <p className="text-sm text-muted">Carregando…</p>

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="text-[17px] font-semibold">Aprovações de pagamento</h2>
        <p className="text-sm text-muted">
          Contas que o financeiro separou para a sua decisão. Aprovar aqui autoriza o
          agendamento do pagamento — e fica registrado em seu nome.
        </p>
      </header>
      {erro ? <p className="rounded-card border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{erro}</p> : null}

      {pendentes.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-sm text-muted">
          Nada aguardando sua aprovação no momento.
        </p>
      ) : (
        <>
          {/* Lote: 12 contas em 3 cliques (todas → aprovar → confirmar), não 24. */}
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-bd bg-surface2/60 px-4 py-2.5">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={marcadas.size === pendentes.length && pendentes.length > 0}
                onChange={(e) => setMarcadas(e.target.checked ? new Set(pendentes.map((p) => p.id)) : new Set())}
                className="h-4 w-4 accent-[rgb(var(--primary))]"
              />
              Selecionar todas ({pendentes.length})
            </label>
            {marcadas.size > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const soma = pendentes.filter((p) => marcadas.has(p.id)).reduce((s, p) => s + p.valorCentavos, 0)
                  if (!window.confirm(`Aprovar ${marcadas.size} conta(s) — total ${brl(soma)}? Fica registrado em seu nome.`)) return
                  setErro('')
                  api
                    .decidirLote([...marcadas], 'aprovada', '')
                    .then(() => setMarcadas(new Set()))
                    .catch((e) => setErro(e instanceof Error ? e.message : 'Falha no lote'))
                }}
                className="fx-press ml-auto rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white"
              >
                Aprovar selecionadas ({marcadas.size})
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            {pendentes.map((a) => (
              <Cartao
                key={a.id}
                a={a}
                eventos={eventosPor.get(a.id) ?? []}
                api={api}
                onErro={setErro}
                decisivel
                marcada={marcadas.has(a.id)}
                onMarcar={(v) =>
                  setMarcadas((m) => {
                    const n = new Set(m)
                    if (v) n.add(a.id)
                    else n.delete(a.id)
                    return n
                  })
                }
              />
            ))}
          </div>
        </>
      )}

      {outras.length ? (
        <>
          <h3 className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">Já decididas — em andamento</h3>
          <div className="flex flex-col gap-3">
            {outras.map((a) => (
              <Cartao key={a.id} a={a} eventos={eventosPor.get(a.id) ?? []} api={api} onErro={setErro} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function Cartao({
  a,
  eventos,
  api,
  onErro,
  decisivel,
  marcada,
  onMarcar,
}: {
  a: Aprovacao
  eventos: readonly EventoAprovacao[]
  api: ReturnType<typeof useAprovacoes>
  onErro: (m: string) => void
  decisivel?: boolean
  marcada?: boolean
  onMarcar?: (v: boolean) => void
}) {
  const [trilha, setTrilha] = useState(false)
  const [pergunta, setPergunta] = useState('')
  const [agindo, setAgindo] = useState(false)

  async function decidir(decisao: 'aprovada' | 'reprovada') {
    const motivo =
      decisao === 'reprovada'
        ? window.prompt(`Reprovar ${a.fornecedor} (${brl(a.valorCentavos)})? Conte o motivo pro financeiro:`) ?? ''
        : ''
    if (decisao === 'reprovada' && !motivo.trim()) return
    if (decisao === 'aprovada' && !window.confirm(`Aprovar ${a.fornecedor} — ${brl(a.valorCentavos)}, vence ${dataBr(a.vencimento)}?`)) return
    setAgindo(true)
    onErro('')
    try {
      await api.decidir(a.id, decisao, motivo.trim())
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Não foi possível registrar — tente de novo')
    }
    setAgindo(false)
  }

  async function perguntar() {
    if (!pergunta.trim()) return
    onErro('')
    try {
      await api.comentar(a.id, pergunta.trim())
      setPergunta('')
      setTrilha(true)
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Não foi possível enviar')
    }
  }

  return (
    <article className="rounded-card border border-bd bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        {onMarcar ? (
          <input type="checkbox" checked={marcada ?? false} onChange={(e) => onMarcar(e.target.checked)} className="h-4 w-4 shrink-0 accent-[rgb(var(--primary))]" aria-label="selecionar" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold">{a.fornecedor}</p>
          <p className="text-xs text-muted">{a.descricao ? `${a.descricao} · ` : ''}vence {dataBr(a.vencimento)}</p>
        </div>
        <span className="text-[15px] font-bold tabular-nums">{brl(a.valorCentavos)}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COR_STATUS[a.status]}`}>{ROTULO_STATUS[a.status]}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {decisivel ? (
          <>
            <button type="button" disabled={agindo} onClick={() => void decidir('aprovada')} className="fx-press rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
              Aprovar
            </button>
            <button type="button" disabled={agindo} onClick={() => void decidir('reprovada')} className="fx-press rounded-lg border border-danger/40 px-4 py-1.5 text-xs font-semibold text-danger disabled:opacity-60">
              Reprovar
            </button>
          </>
        ) : null}
        <button type="button" onClick={() => setTrilha((v) => !v)} className="ml-auto text-xs text-muted underline hover:text-text">
          conversa ({eventos.length}) {trilha ? '▴' : '▾'}
        </button>
      </div>
      {trilha ? (
        <div className="mt-3 flex flex-col gap-1 border-l-2 border-bd pl-3">
          {eventos.map((e) => (
            <p key={e.id} className="text-xs text-muted">
              <span className="tabular-nums">{quando(e.criadoEm)}</span> ·{' '}
              <span className="font-medium text-text">{e.autorRotulo}</span> {ROTULO_EVENTO[e.tipo]}
              {e.texto ? <span className="block pl-4">“{e.texto}”</span> : null}
            </p>
          ))}
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void perguntar() }}
              placeholder="Perguntar ao financeiro…"
              className="flex-1 rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button type="button" onClick={() => void perguntar()} className="rounded-lg border border-bd px-3 py-1.5 text-xs text-muted hover:text-text">
              Enviar
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
