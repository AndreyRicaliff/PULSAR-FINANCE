/**
 * @file Menu de contexto unificado da Matriz de Classificações. Em vez de submenus
 * flutuantes aninhados (popover frágil), o painel troca de VISTA internamente:
 * ações → mover/renomear. Ações variam pelo alvo (item pendente, conciliado ou nó).
 */
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { PREMISSAS, type Sugestao } from '@/core/matriz-classificacao'
import type { No, RegimeDemo } from '@/core/modelo'
import type { ItemConc } from './tipos'
import { FormRenomeItem, FormRenomeNo, ListaMover } from './MenuFormularios.tsx'
import { opcoesSelect } from './util'

const REGIMES: [RegimeDemo, string][] = [
  ['ambos', 'DRE + DFC'],
  ['dre', 'Só DRE'],
  ['dfc', 'Só DFC'],
]

export type AlvoMenu =
  | { readonly tipo: 'item'; readonly chave: string; readonly conciliado: boolean; readonly x: number; readonly y: number }
  | { readonly tipo: 'no'; readonly noId: string; readonly raiz: boolean; readonly x: number; readonly y: number }

type Vista = 'acoes' | 'mover' | 'renome-item' | 'renome-no' | 'regime'

export interface AcoesMenu {
  readonly onMapear: (chave: string, noId: string) => void
  readonly onDesmapear: (chave: string) => void
  readonly onRemoveNo: (id: string) => void
  readonly onRenomearNo: (id: string, nome: string) => void
  readonly onDefinirRegime: (id: string, regime: RegimeDemo) => void
  readonly onVerMovimentos: (chave: string) => void
  readonly onAlternarRecolhido: (id: string) => void
  readonly onRecolherTodos: (recolher: boolean) => void
}

interface Props extends AcoesMenu {
  readonly alvo: AlvoMenu
  readonly entidade: 'categoria' | 'contraparte'
  readonly estrutura: readonly No[]
  readonly mapa: Readonly<Record<string, string>>
  readonly porChave: ReadonlyMap<string, ItemConc>
  readonly sugerir?: (titulo: string) => Sugestao | null
  readonly recolhidos: ReadonlySet<string>
  readonly onFechar: () => void
}

export function MenuContexto(props: Props) {
  const { alvo, onFechar } = props
  const [vista, setVista] = useState<Vista>('acoes')
  return (
    <Overlay x={alvo.x} y={alvo.y} onFechar={onFechar}>
      <Conteudo {...props} vista={vista} onVista={setVista} />
    </Overlay>
  )
}

function Conteudo(props: Props & { vista: Vista; onVista: (v: Vista) => void }) {
  const { alvo, vista, onVista, onFechar } = props
  if (vista === 'renome-item' && alvo.tipo === 'item') {
    return <FormRenomeItem entidade={props.entidade} codigo={alvo.chave} onFechar={onFechar} />
  }
  if (vista === 'renome-no' && alvo.tipo === 'no') {
    const no = props.estrutura.find((n) => n.id === alvo.noId)
    return <FormRenomeNo nomeAtual={no?.nome ?? ''} onSalvar={(nome) => props.onRenomearNo(alvo.noId, nome)} onFechar={onFechar} />
  }
  if (vista === 'regime' && alvo.tipo === 'no') {
    const atual = props.estrutura.find((n) => n.id === alvo.noId)?.meta?.regime ?? 'ambos'
    return (
      <div className="py-1">
        <p className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted">Entra em qual demonstração?</p>
        {REGIMES.map(([r, l]) => (
          <Acao key={r} rotulo={`${atual === r ? '✓ ' : ''}${l}`} onClick={() => fechar(onFechar, () => props.onDefinirRegime(alvo.noId, r))} />
        ))}
      </div>
    )
  }
  if (vista === 'mover' && alvo.tipo === 'item') {
    return (
      <ListaMover
        opcoes={opcoesSelect(props.estrutura)}
        onEscolher={(noId) => {
          props.onMapear(alvo.chave, noId)
          onFechar()
        }}
      />
    )
  }
  return alvo.tipo === 'item' ? <AcoesItem {...props} alvo={alvo} onVista={onVista} /> : <AcoesNo {...props} alvo={alvo} onVista={onVista} />
}

function AcoesItem(props: Props & { alvo: Extract<AlvoMenu, { tipo: 'item' }>; onVista: (v: Vista) => void }) {
  const { alvo, porChave, sugerir, onVista, onFechar } = props
  const item = porChave.get(alvo.chave)
  const sug = item && !alvo.conciliado ? (sugerir?.(item.titulo) ?? null) : null
  const destino = sug?.noId ? props.estrutura.find((n) => n.id === sug.noId) : undefined
  return (
    <div className="py-1">
      {sug && destino ? (
        <Acao
          rotulo={`Conciliar em ${destino.nome}`}
          detalhe={detalheSugestao(sug)}
          onClick={() => fechar(onFechar, () => props.onMapear(alvo.chave, destino.id))}
        />
      ) : null}
      <Acao rotulo={alvo.conciliado ? 'Mover para…' : 'Conciliar em…'} onClick={() => onVista('mover')} />
      {alvo.conciliado ? (
        <Acao rotulo="Desconciliar" onClick={() => fechar(onFechar, () => props.onDesmapear(alvo.chave))} />
      ) : null}
      <Acao
        rotulo={`Ver movimentos${item?.qtd ? ` (${item.qtd})` : ''}`}
        onClick={() => fechar(onFechar, () => props.onVerMovimentos(alvo.chave))}
      />
      <Acao rotulo="✎ Renomear" onClick={() => onVista('renome-item')} />
    </div>
  )
}

function AcoesNo(props: Props & { alvo: Extract<AlvoMenu, { tipo: 'no' }>; onVista: (v: Vista) => void }) {
  const { alvo, estrutura, mapa, recolhidos, onVista, onFechar } = props
  const chavesDoNo = useMemo(() => chavesConciliadasNo(alvo.noId, alvo.raiz, estrutura, mapa), [alvo, estrutura, mapa])
  return (
    <div className="py-1">
      <Acao rotulo="✎ Renomear" onClick={() => onVista('renome-no')} />
      {props.entidade === 'categoria' ? (
        <Acao rotulo={`Regime (DRE/DFC) → ${alvo.raiz ? 'grupo' : 'subgrupo'}`} onClick={() => onVista('regime')} />
      ) : null}
      {alvo.raiz ? (
        <>
          <Acao
            rotulo={recolhidos.has(alvo.noId) ? 'Expandir grupo' : 'Recolher grupo'}
            onClick={() => fechar(onFechar, () => props.onAlternarRecolhido(alvo.noId))}
          />
          <Acao rotulo="Recolher todos" onClick={() => fechar(onFechar, () => props.onRecolherTodos(true))} />
          <Acao rotulo="Expandir todos" onClick={() => fechar(onFechar, () => props.onRecolherTodos(false))} />
        </>
      ) : null}
      {chavesDoNo.length > 0 ? (
        <Acao
          rotulo={`Desconciliar todos (${chavesDoNo.length})`}
          onClick={() => fechar(onFechar, () => chavesDoNo.forEach(props.onDesmapear))}
        />
      ) : null}
      <Acao rotulo="Remover grupo" perigo onClick={() => fechar(onFechar, () => props.onRemoveNo(alvo.noId))} />
    </div>
  )
}

/** Chaves conciliadas no nó (raiz inclui os subgrupos — espelha o total do cabeçalho). */
function chavesConciliadasNo(
  noId: string,
  raiz: boolean,
  estrutura: readonly No[],
  mapa: Readonly<Record<string, string>>,
): string[] {
  const ids = new Set([noId, ...(raiz ? estrutura.filter((n) => n.paiId === noId).map((n) => n.id) : [])])
  return Object.keys(mapa).filter((chave) => {
    const destino = mapa[chave]
    return destino !== undefined && ids.has(destino)
  })
}

function detalheSugestao(sug: Sugestao): string | undefined {
  const avisos = sug.premissas.map((p) => `${p}: ${PREMISSAS[p]}`)
  const partes = [...avisos, ...(sug.nota ? [sug.nota] : [])]
  return partes.length ? partes.join(' · ') : undefined
}

function fechar(onFechar: () => void, acao: () => void): void {
  acao()
  onFechar()
}

function Acao({ rotulo, detalhe, perigo, onClick }: { rotulo: string; detalhe?: string; perigo?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={detalhe}
      className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-surface2 ${perigo ? 'text-danger' : ''}`}
    >
      {rotulo}
      {detalhe ? <span className="mt-0.5 block truncate text-[11px] text-muted">{detalhe}</span> : null}
    </button>
  )
}

function Overlay({ x, y, onFechar, children }: { x: number; y: number; onFechar: () => void; children: React.ReactNode }) {
  // Portal no body: ancestral com transform retido (anim-*) vira containing block e
  // prenderia o fixed no topo do painel — bug visto com a página scrollada.
  // Clamp pra não estourar a viewport (288px de largura; vista mais alta ≈ 330px).
  const left = Math.max(8, Math.min(x, window.innerWidth - 300))
  const top = Math.max(8, Math.min(y, window.innerHeight - 340))
  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onClick={onFechar}
      onContextMenu={(e) => {
        e.preventDefault()
        onFechar()
      }}
    >
      <div
        style={{ left, top }}
        className="anim-pop absolute w-72 overflow-hidden rounded-lg border border-bd bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
