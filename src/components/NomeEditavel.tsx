/** @file Nome com edição inline que grava override (original do ERP imutável) + botão ◷ de histórico. */
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { edicoesDe, type EdicaoNome } from '@/core/historicoEdicao'
import type { Dimensao } from '@/core/modelo'
import type { EntidadeEditavel, NomeResolvido } from '@/core/override'
import { useProvedor } from '@/lib/clientes'
import { useModelo } from '@/lib/useModelo'
import { useOverrides } from '@/lib/overrides'
import { BadgeEditado } from './BadgeEditado.tsx'

interface Props {
  readonly entidade: EntidadeEditavel
  readonly codigo: string
  readonly resolvido: NomeResolvido
}

export function NomeEditavel({ entidade, codigo, resolvido }: Props) {
  const { nome: provedor } = useProvedor()
  const { renomear, restaurar, historico } = useOverrides()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(resolvido.nome)
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const edicoes = useMemo(() => edicoesDe(historico, entidade, codigo), [historico, entidade, codigo])

  if (editando) {
    return (
      <Editor
        valor={valor}
        onValor={setValor}
        onSalvar={() => {
          renomear(entidade, codigo, valor)
          setEditando(false)
        }}
        onCancelar={() => {
          setValor(resolvido.nome)
          setEditando(false)
        }}
      />
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span title={resolvido.editado ? `Original ${provedor}: ${resolvido.original}` : undefined}>
        {resolvido.nome}
      </span>
      {resolvido.editado ? <BadgeEditado original={resolvido.original} /> : null}
      <Acao
        onClick={(e) => {
          e.stopPropagation()
          setValor(resolvido.nome)
          setEditando(true)
        }}
        titulo="Renomear"
      >
        ✎
      </Acao>
      {edicoes.length > 0 ? (
        <Acao
          onClick={(e) => {
            e.stopPropagation()
            setHistoricoAberto(true)
          }}
          titulo="Histórico de edição"
        >
          ◷
        </Acao>
      ) : null}
      {resolvido.editado ? (
        <Acao
          onClick={(e) => {
            e.stopPropagation()
            restaurar(entidade, codigo)
          }}
          titulo={`Restaurar original: ${resolvido.original}`}
        >
          ↺
        </Acao>
      ) : null}
      {historicoAberto ? (
        <ModalHistorico
          entidade={entidade}
          codigo={codigo}
          resolvido={resolvido}
          edicoes={edicoes}
          provedor={provedor}
          onFechar={() => setHistoricoAberto(false)}
        />
      ) : null}
    </span>
  )
}

/** Dimensão da Matriz correspondente à entidade (título não concilia). */
const DIM_DA_ENTIDADE: Readonly<Partial<Record<EntidadeEditavel, Dimensao>>> = {
  categoria: 'contas',
  contraparte: 'fornecedores',
}

/**
 * Histórico da entidade: cadeia de renomes (mais recente primeiro) + destino atual na
 * Matriz — o "pra onde essa conta foi conciliada" que se perde depois de renomear.
 * Sem <input>/<table>/<svg> de propósito: o CSS dos modais largos casaria e alargaria.
 */
function ModalHistorico({
  entidade,
  codigo,
  resolvido,
  edicoes,
  provedor,
  onFechar,
}: {
  entidade: EntidadeEditavel
  codigo: string
  resolvido: NomeResolvido
  edicoes: readonly EdicaoNome[]
  provedor: string
  onFechar: () => void
}) {
  const { modelo } = useModelo()
  const dim = DIM_DA_ENTIDADE[entidade]
  const destino = useMemo(() => {
    if (!dim) return null
    const conc = modelo[dim]
    const noId = conc.mapa[codigo]
    if (!noId) return { texto: 'ainda não conciliada na Matriz' }
    const no = conc.estrutura.find((n) => n.id === noId)
    if (!no) return { texto: 'grupo de destino não existe mais (órfã)' }
    const pai = no.paiId ? conc.estrutura.find((n) => n.id === no.paiId) : null
    return { texto: pai ? `${pai.nome} → ${no.nome}` : no.nome }
  }, [modelo, dim, codigo])

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={(e) => { e.stopPropagation(); onFechar() }}>
      <div className="anim-pop flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-auto rounded-card border border-bd bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Histórico de edição</h2>
            <p className="mt-0.5 truncate text-sm" title={resolvido.nome}>{resolvido.nome}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="fx-press grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-bd text-muted transition-colors hover:border-danger hover:text-danger"
          >
            ✕
          </button>
        </div>

        <ul className="flex flex-col gap-1.5 text-xs">
          {edicoes.map((e) => (
            <li key={e.t} className="flex flex-col rounded-md border border-bd/60 bg-surface2/40 px-2.5 py-1.5">
              <span className="tabular-nums text-muted">{quando(e.t)}</span>
              <span className="mt-0.5">
                <NomeDoEvento nome={e.de} original={resolvido.original} /> → <NomeDoEvento nome={e.para} original={resolvido.original} />
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-1 border-t border-bd/60 pt-2 text-xs text-muted">
          <p>
            Original {provedor}: <span className="text-text">{resolvido.original}</span>
          </p>
          {destino ? (
            <p>
              Destino na Matriz: <span className="text-text">{destino.texto}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function NomeDoEvento({ nome, original }: { nome: string | null; original: string }) {
  if (nome === null) return <span className="italic text-muted" title={original}>original do ERP</span>
  return <span className="text-text">{nome}</span>
}

/** '2026-08-03T14:32:07.123Z' → data/hora local legível. */
function quando(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Editor({
  valor,
  onValor,
  onSalvar,
  onCancelar,
}: {
  valor: string
  onValor: (v: string) => void
  onSalvar: () => void
  onCancelar: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={valor}
        onChange={(e) => onValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSalvar()
          if (e.key === 'Escape') onCancelar()
        }}
        className="w-56 rounded border border-primary bg-surface2 px-2 py-0.5 text-sm outline-none"
      />
      <Acao onClick={onSalvar} titulo="Salvar">
        ✓
      </Acao>
      <Acao onClick={onCancelar} titulo="Cancelar">
        ✕
      </Acao>
    </span>
  )
}

function Acao({
  onClick,
  titulo,
  children,
}: {
  onClick: (e: MouseEvent) => void
  titulo: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      className="text-xs text-muted hover:text-primary"
    >
      {children}
    </button>
  )
}
