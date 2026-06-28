/**
 * @file Editor da Apresentação: capa + roteiro ordenado. Cada item é um slide de SEÇÃO
 * (argumento rico + observação) ou um slide LIVRE (título + argumento rico em página inteira).
 */
import { useMemo, useState } from 'react'
import { dataDoMovimento, type Intervalo } from '@/core/periodo'
import { exportarApresentacao } from '@/lib/apresentacaoAutonoma'
import { brl } from '@/lib/money'
import { useApresentacao, type ApresentacaoApi } from '@/lib/useApresentacao'
import { useMovimentos } from '@/lib/movimentos'
import { useSaldosIniciais } from '@/lib/useSaldosIniciais'
import { useClientes } from '@/lib/clientes'
import { SECOES_SLIDE, ROTULO_SECAO, type FaixaMesesRel, type SlideItem } from '../apresentacao/tipos'
import { EditorRico } from '../apresentacao/EditorRico.tsx'
import { SeletorMeses, rotuloMes } from '../SeletorMeses.tsx'

const ultimoDia = (mes: string): string => {
  const [a, m] = [Number(mes.slice(0, 4)), Number(mes.slice(5, 7))]
  return `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
}
const faixaParaIntervalo = (f: FaixaMesesRel): Intervalo => ({
  inicio: f.de ? `${f.de}-01` : null,
  fim: f.ate ? ultimoDia(f.ate) : null,
})

type Estado = { tipo: 'idle' } | { tipo: 'gerando' } | { tipo: 'ok' } | { tipo: 'erro'; msg: string }

export function RelatorioApresentacao() {
  const { ativo } = useClientes()
  const api = useApresentacao()
  const [estado, setEstado] = useState<Estado>({ tipo: 'idle' })

  const gerar = async () => {
    setEstado({ tipo: 'gerando' })
    try {
      await exportarApresentacao(ativo, faixaParaIntervalo(api.estado.periodo))
      setEstado({ tipo: 'ok' })
    } catch (e) {
      setEstado({ tipo: 'erro', msg: e instanceof Error ? e.message : 'falha ao gerar' })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Apresentação (slideshow)</h1>
        <p className="text-sm text-muted">
          Roteiro de slides de <strong className="text-text">{ativo.nome}</strong> — capa, slides de dado (argumento +
          observação) e slides livres (título + texto em página inteira). Exporta um HTML offline navegável.
        </p>
      </header>

      <CartaoCapa api={api} />
      <CartaoPeriodo api={api} />
      <CartaoSaldos />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Roteiro ({api.estado.roteiro.length} slides)</h2>
        {api.estado.roteiro.map((item, i) => (
          <CartaoItem key={chaveItem(item, i)} api={api} item={item} i={i} total={api.estado.roteiro.length} />
        ))}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-bd p-3">
          <button type="button" onClick={api.adicionarLivre} className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-medium text-secondary hover:border-primary">
            + Slide livre (texto)
          </button>
          <span className="text-xs text-muted">· seção:</span>
          {SECOES_SLIDE.map((s) => (
            <button key={s.id} type="button" onClick={() => api.adicionarSecao(s.id)} className="rounded-full border border-bd bg-surface2 px-3 py-1 text-xs hover:border-primary">
              + {s.rotulo}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={gerar}
          disabled={estado.tipo === 'gerando' || api.estado.roteiro.length === 0}
          className="fx-sheen fx-press rounded-lg bg-gradient-to-r from-primary to-secondary px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {estado.tipo === 'gerando' ? 'Gerando…' : 'Gerar e baixar (.html)'}
        </button>
        <span className="text-xs text-muted">o HTML abre já no período escolhido · imprima com Ctrl/Cmd+P</span>
        {estado.tipo === 'ok' ? <span className="text-xs text-accent">Gerado para {ativo.nome}.</span> : null}
        {estado.tipo === 'erro' ? <span className="text-xs text-danger">Erro: {estado.msg}</span> : null}
      </div>
    </div>
  )
}

const chaveItem = (item: SlideItem, i: number) => (item.tipo === 'livre' ? item.id : `${item.secao}-${i}`)

function CartaoItem({ api, item, i, total }: { api: ApresentacaoApi; item: SlideItem; i: number; total: number }) {
  const rotulo = item.tipo === 'livre' ? 'Slide livre' : ROTULO_SECAO[item.secao]
  return (
    <div className="rounded-card border border-bd bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <span className="text-xs tabular-nums text-muted">{i + 2}.</span>
          {rotulo}
          {item.tipo === 'livre' ? <span className="rounded bg-secondary/15 px-1.5 py-0.5 text-[10px] font-medium text-secondary">texto</span> : null}
        </span>
        <span className="flex items-center gap-1 text-muted">
          <Acao titulo="Subir" desabilitado={i === 0} onClick={() => api.mover(i, i - 1)}>↑</Acao>
          <Acao titulo="Descer" desabilitado={i === total - 1} onClick={() => api.mover(i, i + 1)}>↓</Acao>
          <Acao titulo="Remover slide" onClick={() => api.remover(i)}>✕</Acao>
        </span>
      </div>

      {item.tipo === 'livre' ? (
        <>
          <Campo rotulo="Título do slide" valor={item.titulo} onChange={(v) => api.patchItem(i, { titulo: v })} placeholder="Ex.: Análise dos Cartões de Crédito" />
          <label className="mb-1 mt-3 block text-xs font-medium text-muted">Argumento (página inteira · texto rico · cole tabelas se quiser)</label>
          <EditorRico valor={item.argumento} onChange={(html) => api.patchItem(i, { argumento: html })} placeholder="Texto livre do slide…" linhas={30} />
          <div className="mt-3">
            <UploadImagem rotulo="Anexo (imagem · aparece neste slide)" valor={item.anexo} onChange={(d) => api.patchItem(i, { anexo: d })} />
          </div>
        </>
      ) : (
        <>
          <Campo rotulo="Título do slide (vazio = padrão da seção)" valor={item.titulo ?? ''} onChange={(v) => api.patchItem(i, { titulo: v })} placeholder={ROTULO_SECAO[item.secao]} />
          <label className="mb-1 mt-3 block text-xs font-medium text-muted">Argumento (topo · até 20 linhas · negrito/itálico)</label>
          <EditorRico valor={item.argumento} onChange={(html) => api.patchItem(i, { argumento: html })} placeholder="Análise/argumento desta seção…" linhas={20} />
          <label className="mb-1 mt-3 block text-xs font-medium text-muted">Observação (rodapé · até 5 linhas)</label>
          <textarea
            value={item.observacao}
            onChange={(e) => api.patchItem(i, { observacao: e.target.value })}
            rows={3}
            placeholder="Observação curta (opcional)…"
            className="w-full resize-y rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
        </>
      )}
    </div>
  )
}

function CartaoPeriodo({ api }: { api: ApresentacaoApi }) {
  const { movimentos } = useMovimentos()
  const { de, ate } = api.estado.periodo
  const dados = useMemo(() => {
    const meses = movimentos
      .map((m) => dataDoMovimento(m, 'competencia')?.slice(0, 7))
      .filter((x): x is string => Boolean(x))
      .sort()
    return { min: meses[0] ?? null, max: meses.at(-1) ?? null, qtd: new Set(meses).size }
  }, [movimentos])

  const rotuloPeriodo = !de && !ate ? 'Todo o período' : de === ate ? rotuloMes(de) : `${rotuloMes(de)} → ${rotuloMes(ate)}`

  return (
    <section className="rounded-card border border-bd bg-surface p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Período do relatório</h2>
      <p className="mb-3 text-xs text-muted">Escolha o mês (ou a faixa) antes de gerar — o HTML exportado já abre filtrado nesse período, pronto para imprimir.</p>
      <div className="flex flex-wrap items-center gap-4">
        <SeletorMeses
          faixa={{ de, ate }}
          onChange={api.definirPeriodo}
          minMes={dados.min ?? undefined}
          maxMes={dados.max ?? undefined}
        />
        {/* caixinha que indica o mês dos dados */}
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-secondary))" strokeWidth="1.6" strokeLinecap="round" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Mês dos dados</div>
            <div className="text-sm font-bold tabular-nums text-secondary">{dados.max ? rotuloMes(dados.max) : '—'}</div>
          </div>
          <div className="ml-2 border-l border-primary/30 pl-3">
            <div className="text-[10px] uppercase tracking-wide text-muted">Disponível</div>
            <div className="text-xs tabular-nums text-text">{dados.min ? `${rotuloMes(dados.min)} → ${rotuloMes(dados.max)}` : 'sem dados'}</div>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted">Relatório sairá de</div>
          <div className="text-sm font-semibold text-text">{rotuloPeriodo}</div>
        </div>
      </div>
    </section>
  )
}

function CartaoSaldos() {
  const { saldos, definir, remover } = useSaldosIniciais()
  const [mes, setMes] = useState('')
  const [valor, setValor] = useState('')
  const salvos = Object.entries(saldos).sort(([a], [b]) => a.localeCompare(b))
  const salvar = () => {
    if (!mes) return
    definir(mes, Math.round((parseFloat(valor) || 0) * 100))
    setValor('')
  }
  return (
    <section className="rounded-card border border-bd bg-surface p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Saldos iniciais (por mês)</h2>
      <p className="mb-3 text-xs text-muted">Salve o saldo de caixa inicial de cada mês — usado nos relatórios que precisam dele (ex.: Projeção/Fluxo).</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Mês
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm text-text outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Saldo inicial (R$)
          <input type="number" step="0.01" value={valor} placeholder="0,00" onChange={(e) => setValor(e.target.value)} className="w-40 rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm text-text outline-none focus:border-primary" />
        </label>
        <button type="button" onClick={salvar} disabled={!mes} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary disabled:opacity-50">
          Salvar
        </button>
      </div>
      {salvos.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {salvos.map(([m, v]) => (
            <span key={m} className="flex items-center gap-2 rounded-full border border-bd bg-surface2 px-3 py-1 text-xs">
              <span className="font-medium">{m}</span>
              <span className="tabular-nums text-muted">{brl(v)}</span>
              <button type="button" onClick={() => remover(m)} title="Remover" className="text-muted hover:text-danger">✕</button>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function CartaoCapa({ api }: { api: ApresentacaoApi }) {
  const { capa } = api.estado
  return (
    <section className="rounded-card border border-bd bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">1. Capa</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo rotulo="Título" valor={capa.titulo} onChange={(v) => api.definirCapa({ titulo: v })} placeholder="Relatório Financeiro — …" />
        <Campo rotulo="Subtítulo" valor={capa.subtitulo} onChange={(v) => api.definirCapa({ subtitulo: v })} placeholder="Competência · regime…" />
        <Campo rotulo="Elaborado por" valor={capa.elaboradoPor} onChange={(v) => api.definirCapa({ elaboradoPor: v })} placeholder="AG Consultoria" />
      </div>
    </section>
  )
}

function UploadImagem({ rotulo, valor, onChange }: { rotulo: string; valor?: string; onChange: (d: string | undefined) => void }) {
  const [erro, setErro] = useState('')
  const ler = (file?: File) => {
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return setErro('imagem maior que 3 MB — comprima antes')
    setErro('')
    const r = new FileReader()
    r.onload = () => onChange(typeof r.result === 'string' ? r.result : undefined)
    r.readAsDataURL(file)
  }
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{rotulo}</label>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-xs hover:border-primary">
          {valor ? '↻ Trocar imagem' : '+ Enviar imagem'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => ler(e.target.files?.[0])} />
        </label>
        {valor ? (
          <>
            <img src={valor} alt="logo" className="h-10 w-auto rounded border border-bd bg-white p-0.5" />
            <button type="button" onClick={() => onChange(undefined)} className="text-xs text-danger hover:underline">remover</button>
          </>
        ) : null}
      </div>
      {erro ? <p className="mt-1 text-xs text-danger">{erro}</p> : null}
    </div>
  )
}

function Campo({ rotulo, valor, onChange, placeholder }: { rotulo: string; valor: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      {rotulo}
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-primary"
      />
    </label>
  )
}

function Acao({ titulo, onClick, desabilitado, children }: { titulo: string; onClick: () => void; desabilitado?: boolean; children: string }) {
  return (
    <button type="button" title={titulo} onClick={onClick} disabled={desabilitado} className="rounded px-1.5 py-0.5 text-sm hover:bg-surface2 hover:text-text disabled:opacity-30">
      {children}
    </button>
  )
}
