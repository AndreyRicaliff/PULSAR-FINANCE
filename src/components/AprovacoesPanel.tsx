/**
 * @file Fila de aprovação de contas a pagar (lado do financeiro).
 * Enquanto o acesso do cliente não tem e-mail real (fase 3), a decisão que ele der por
 * fora é REGISTRADA aqui — e a trilha diz que foi o Financeiro que registrou.
 */
import { useMemo, useState, type ReactNode } from 'react'
import {
  COR_STATUS,
  emAberto,
  podeIr,
  ROTULO_EVENTO,
  ROTULO_STATUS,
  somarMeses,
  type Aprovacao,
  type EventoAprovacao,
} from '@/core/aprovacao'
import { estaAberto } from '@/core/titulo'
import { isoDeMov } from '@/core/periodo'
import { useCadastros } from '@/lib/cadastros'
import { useAprovacoes, type AprovacoesApi, type NovaConta } from '@/lib/aprovacoes'
import { brl, centavosDeTexto } from '@/lib/money'
import { useTitulos } from '@/lib/useTitulos'
import { KpiCard } from './KpiCard.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'

const CLASSE_INPUT =
  'rounded-lg border border-bd bg-surface2 px-4 py-2.5 text-sm outline-none focus:border-primary'

type Filtro = 'abertas' | 'encerradas' | 'todas'
const FILTROS: readonly OpcaoSeg<Filtro>[] = [
  { id: 'abertas', rotulo: 'Abertas' },
  { id: 'encerradas', rotulo: 'Encerradas' },
  { id: 'todas', rotulo: 'Todas' },
]

export function AprovacoesPanel() {
  const api = useAprovacoes()
  const { titulos } = useTitulos()
  const { nomesContrapartes } = useCadastros()
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const [criando, setCriando] = useState(false)
  const [decidindo, setDecidindo] = useState<Aprovacao | null>(null)
  const [erro, setErro] = useState('')

  // Candidatos à importação: títulos a PAGAR em aberto que ainda não estão na fila.
  const jaImportados = useMemo(() => new Set(api.aprovacoes.map((a) => a.tituloRef).filter(Boolean)), [api.aprovacoes])
  const candidatos = useMemo(
    () => titulos.filter((t) => t.natureza === 'P' && estaAberto(t) && !jaImportados.has(t.id)),
    [titulos, jaImportados],
  )

  const visiveis = useMemo(() => {
    if (filtro === 'abertas') return api.aprovacoes.filter(emAberto)
    if (filtro === 'encerradas') return api.aprovacoes.filter((a) => !emAberto(a))
    return api.aprovacoes
  }, [api.aprovacoes, filtro])

  const pendentes = useMemo(() => api.aprovacoes.filter((a) => a.status === 'pendente'), [api.aprovacoes])
  const aAgendar = useMemo(() => api.aprovacoes.filter((a) => a.status === 'aprovada'), [api.aprovacoes])
  const somar = (xs: readonly Aprovacao[]) => xs.reduce((s, a) => s + a.valorCentavos, 0)

  const porAprovacao = useMemo(() => {
    const m = new Map<string, EventoAprovacao[]>()
    for (const e of api.eventos) {
      const lista = m.get(e.aprovacaoId) ?? []
      lista.push(e)
      m.set(e.aprovacaoId, lista)
    }
    return m
  }, [api.eventos])

  async function importar() {
    setErro('')
    const contas: NovaConta[] = candidatos.map((t) => ({
      fornecedor: nomesContrapartes.get(t.fornecedorCodigo) ?? t.fornecedorCodigo ?? 'FORNECEDOR',
      descricao: [t.documento, t.parcela].filter(Boolean).join(' · '),
      valorCentavos: t.valorCentavos,
      vencimento: isoDeMov(t.dataVencimento) ?? new Date().toISOString().slice(0, 10),
      tituloRef: t.id,
    }))
    try {
      await api.criar(contas)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold">Aprovações de Pagamento</h1>
          <p className="text-sm text-muted">
            O cliente aprova antes do agendamento. Cada conta carrega a própria conversa — a
            trilha é a auditoria que substitui a planilha.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void importar()}
            disabled={candidatos.length === 0}
            className="fx-press rounded-lg border border-bd px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            Importar títulos em aberto ({candidatos.length})
          </button>
          <button type="button" onClick={() => setCriando(true)} className="fx-press rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">
            + Nova conta
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo="Aguardando o cliente" valor={brl(somar(pendentes))} nota={`${pendentes.length} conta(s)`} cor="warn" />
        <KpiCard rotulo="Aprovadas a agendar" valor={brl(somar(aAgendar))} nota={`${aAgendar.length} conta(s)`} cor="accent" />
        <KpiCard rotulo="Em aberto na fila" valor={brl(somar(api.aprovacoes.filter(emAberto)))} cor="secondary" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmento opcoes={FILTROS} valor={filtro} onTrocar={setFiltro} />
        {erro ? <p className="text-[13px] text-danger">{erro}</p> : null}
      </div>

      {api.carregando ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-sm text-muted">
          {filtro === 'abertas'
            ? 'Nada aguardando ação. Importe os títulos em aberto ou crie uma conta manual.'
            : 'Nenhuma conta neste filtro.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visiveis.map((a) => (
            <CartaoConta
              key={a.id}
              a={a}
              eventos={porAprovacao.get(a.id) ?? []}
              onDecidir={() => setDecidindo(a)}
              onErro={setErro}
              api={api}
            />
          ))}
        </div>
      )}

      {criando ? <FormConta api={api} onFechar={() => setCriando(false)} /> : null}
      {decidindo ? <FormDecisao api={api} a={decidindo} onFechar={() => setDecidindo(null)} /> : null}
    </div>
  )
}

function dataBr(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

function quando(ts: string): string {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function CartaoConta({
  a,
  eventos,
  onDecidir,
  onErro,
  api,
}: {
  a: Aprovacao
  eventos: readonly EventoAprovacao[]
  onDecidir: () => void
  onErro: (m: string) => void
  api: AprovacoesApi
}) {
  const [trilhaAberta, setTrilhaAberta] = useState(false)
  const [resposta, setResposta] = useState('')

  async function mover(para: Parameters<typeof podeIr>[1]) {
    onErro('')
    try {
      await api.transicao(a.id, para)
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Erro na transição')
    }
  }

  async function marcarMercadoria(recebida: boolean) {
    onErro('')
    try {
      await api.marcarMercadoria(a.id, recebida)
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Erro ao marcar mercadoria')
    }
  }

  async function responder() {
    if (!resposta.trim()) return
    onErro('')
    try {
      await api.comentar(a.id, resposta.trim())
      setResposta('')
      setTrilhaAberta(true)
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Erro ao comentar')
    }
  }

  return (
    <article className="rounded-card border border-bd bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold">{a.fornecedor}</p>
          <p className="text-xs text-muted">
            {a.descricao ? `${a.descricao} · ` : ''}vence {dataBr(a.vencimento)}
            {a.tituloRef ? ' · do ERP' : ' · manual'}
          </p>
        </div>
        <span className="text-[15px] font-bold tabular-nums">{brl(a.valorCentavos)}</span>
        {a.mercadoriaRecebida === false ? (
          <span className="rounded-full bg-warn/15 px-2.5 py-1 text-xs font-semibold text-warn">aguardando mercadoria</span>
        ) : null}
        {a.mercadoriaRecebida === true ? (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-muted">mercadoria ok</span>
        ) : null}
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COR_STATUS[a.status]}`}>
          {ROTULO_STATUS[a.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {a.status === 'pendente' ? (
          <BotaoAcao onClick={onDecidir} destaque>Registrar decisão do cliente</BotaoAcao>
        ) : null}
        {podeIr(a.status, 'agendada') ? <BotaoAcao onClick={() => void mover('agendada')}>Agendar pagamento</BotaoAcao> : null}
        {podeIr(a.status, 'paga') ? <BotaoAcao onClick={() => void mover('paga')}>Marcar paga</BotaoAcao> : null}
        {a.status === 'reprovada' ? <BotaoAcao onClick={() => void mover('pendente')}>Reabrir (nova rodada)</BotaoAcao> : null}
        {a.mercadoriaRecebida === false ? (
          <BotaoAcao onClick={() => void marcarMercadoria(true)}>Mercadoria chegou</BotaoAcao>
        ) : null}
        {emAberto(a) ? <BotaoAcao onClick={() => void mover('cancelada')}>Cancelar</BotaoAcao> : null}
        <button
          type="button"
          onClick={() => setTrilhaAberta((v) => !v)}
          className="ml-auto text-xs text-muted underline hover:text-text"
        >
          trilha ({eventos.length}) {trilhaAberta ? '▴' : '▾'}
        </button>
      </div>

      {trilhaAberta ? (
        <div className="mt-3 flex flex-col gap-1 border-l-2 border-bd pl-3">
          {eventos.map((e) => (
            <p key={e.id} className="text-xs text-muted">
              <span className="tabular-nums">{quando(e.criadoEm)}</span> ·{' '}
              <span className="font-medium text-text">{e.autorRotulo}</span> {ROTULO_EVENTO[e.tipo]}
              {e.texto ? <span className="block pl-4 text-muted">“{e.texto}”</span> : null}
            </p>
          ))}
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void responder() }}
              placeholder="Responder na trilha…"
              className="flex-1 rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button type="button" onClick={() => void responder()} className="rounded-lg border border-bd px-3 py-1.5 text-xs text-muted hover:text-text">
              Enviar
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function BotaoAcao({ children, onClick, destaque }: { children: ReactNode; onClick: () => void; destaque?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fx-press rounded-lg px-3 py-1.5 text-xs font-medium ${
        destaque ? 'bg-primary text-white' : 'border border-bd text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

/** Registrar a decisão recebida do cliente por fora — dito explicitamente na trilha. */
function FormDecisao({ api, a, onFechar }: { api: AprovacoesApi; a: Aprovacao; onFechar: () => void }) {
  const [comentario, setComentario] = useState('decisão recebida do cliente (canal externo)')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function registrar(decisao: 'aprovada' | 'reprovada') {
    setSalvando(true)
    setErro('')
    try {
      await api.decidir(a.id, decisao, comentario.trim())
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar')
      setSalvando(false)
    }
  }

  return (
    <Modal onFechar={onFechar} titulo="Registrar decisão do cliente">
      <p className="text-sm text-muted">
        {a.fornecedor} · {brl(a.valorCentavos)} · vence {dataBr(a.vencimento)}
      </p>
      <p className="rounded-lg bg-warn/10 px-3 py-2 text-[11.5px] leading-relaxed text-warn">
        A decisão fica congelada na trilha em nome do Financeiro. Quando o acesso do cliente
        tiver e-mail real, ele mesmo decide por aqui.
      </p>
      <Campo rotulo="Comentário (vai para a trilha)">
        <input type="text" value={comentario} onChange={(e) => setComentario(e.target.value)} className={CLASSE_INPUT} />
      </Campo>
      {erro ? <p className="text-[13px] text-danger">{erro}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onFechar} className="rounded-lg border border-bd px-4 py-2 text-sm text-muted hover:text-text">Cancelar</button>
        <button type="button" disabled={salvando} onClick={() => void registrar('reprovada')} className="fx-press rounded-lg border border-danger/40 px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60">
          Reprovada
        </button>
        <button type="button" disabled={salvando} onClick={() => void registrar('aprovada')} className="fx-press rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          Aprovada
        </button>
      </div>
    </Modal>
  )
}

function FormConta({ api, onFechar }: { api: AprovacoesApi; onFechar: () => void }) {
  const [fornecedor, setFornecedor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10))
  const [meses, setMeses] = useState('1')
  const [controlaMercadoria, setControlaMercadoria] = useState(false)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    const centavos = centavosDeTexto(valor)
    const n = Math.max(1, Math.min(24, Number.parseInt(meses, 10) || 1))
    if (!fornecedor.trim()) return setErro('Informe o fornecedor.')
    if (centavos === null) return setErro('Valor inválido — use vírgula para centavos.')
    setSalvando(true)
    setErro('')
    // Recorrência da planilha (aluguel/financiamento lançados até dezembro): n contas,
    // vencimento andando de mês em mês, parcela no texto para o cliente saber qual é qual.
    const base = descricao.trim()
    const contas = Array.from({ length: n }, (_, i) => ({
      fornecedor: fornecedor.trim(),
      descricao: n > 1 ? [base, `(${i + 1}/${n})`].filter(Boolean).join(' ') : base,
      valorCentavos: centavos,
      vencimento: somarMeses(vencimento, i),
      mercadoriaRecebida: controlaMercadoria ? false : null,
    }))
    try {
      await api.criar(contas)
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar')
      setSalvando(false)
    }
  }

  return (
    <Modal onFechar={onFechar} titulo="Nova conta a aprovar">
      <Campo rotulo="Fornecedor">
        <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} autoFocus placeholder="Ex.: EMBALAGENS NORDESTE" className={CLASSE_INPUT} />
      </Campo>
      <Campo rotulo="Descrição (opcional)">
        <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: boleto recebido por e-mail" className={CLASSE_INPUT} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Valor (R$)">
          <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="1.234,56" className={`${CLASSE_INPUT} text-right tabular-nums`} />
        </Campo>
        <Campo rotulo="Vencimento">
          <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={CLASSE_INPUT} />
        </Campo>
      </div>
      <div className="grid grid-cols-2 items-end gap-3">
        <Campo rotulo="Repetir mensalmente (meses)">
          <input type="number" min={1} max={24} value={meses} onChange={(e) => setMeses(e.target.value)} className={`${CLASSE_INPUT} text-right tabular-nums`} />
        </Campo>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-muted">
          <input type="checkbox" checked={controlaMercadoria} onChange={(e) => setControlaMercadoria(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--primary))]" />
          Só pagar com mercadoria recebida
        </label>
      </div>
      {Number.parseInt(meses, 10) > 1 ? (
        <p className="text-[11.5px] text-muted">
          Serão criadas {Math.min(24, Number.parseInt(meses, 10) || 1)} contas, uma por mês a partir do vencimento, com a parcela no nome.
        </p>
      ) : null}
      {erro ? <p className="text-[13px] text-danger">{erro}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onFechar} className="rounded-lg border border-bd px-4 py-2 text-sm text-muted hover:text-text">Cancelar</button>
        <button type="button" disabled={salvando} onClick={() => void salvar()} className="fx-press rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {salvando ? 'Criando…' : 'Criar'}
        </button>
      </div>
    </Modal>
  )
}

function Modal({ titulo, children, onFechar }: { titulo: string; children: ReactNode; onFechar: () => void }) {
  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div className="anim-pop flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-card border border-bd bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{titulo}</h2>
        {children}
      </div>
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
