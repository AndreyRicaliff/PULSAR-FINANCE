/** @file Board da conciliação: estrutura à esquerda, pendentes à direita, menu de contexto e collapse — coração da Matriz de Classificações. */
import { useState, type MouseEvent } from 'react'
import type { Sugestao } from '@/core/matriz-classificacao'
import type { Conciliacao, RegimeDemo } from '@/core/modelo'
import { AConciliar } from './AConciliar.tsx'
import { MenuContexto, type AlvoMenu } from './MenuContexto.tsx'
import { RaizCard } from './RaizCard.tsx'
import type { ItemConc } from './tipos'

interface Props {
  readonly conc: Conciliacao
  readonly itens: readonly ItemConc[]
  readonly termo: string
  readonly entidade: 'categoria' | 'contraparte'
  readonly sugerir?: (titulo: string) => Sugestao | null
  readonly onAddNo: (nome: string, paiId: string | null, regime?: RegimeDemo) => void
  readonly onRemoveNo: (id: string) => void
  readonly onRenomearNo: (id: string, nome: string) => void
  readonly onDefinirRegime: (id: string, regime: RegimeDemo) => void
  readonly onMapear: (chave: string, noId: string) => void
  readonly onDesmapear: (chave: string) => void
  readonly onVerMovimentos: (chave: string) => void
}

export function ConciliacaoBoard(props: Props) {
  const { conc, itens, termo, sugerir, onAddNo, onRemoveNo, onMapear, onDesmapear } = props
  const [menu, setMenu] = useState<AlvoMenu | null>(null)
  const [recolhidos, setRecolhidos] = useState<ReadonlySet<string>>(new Set())
  const porChave = new Map(itens.map((i) => [i.chave, i]))
  const raizes = conc.estrutura.filter((n) => !n.paiId)
  const naoConciliados = itens.filter((i) => !conc.mapa[i.chave])

  const abrirItem = (conciliado: boolean) => (chave: string, e: MouseEvent) => {
    e.preventDefault()
    setMenu({ tipo: 'item', chave, conciliado, x: e.clientX, y: e.clientY })
  }

  const abrirNo = (noId: string, raiz: boolean, e: MouseEvent) => {
    e.preventDefault()
    setMenu({ tipo: 'no', noId, raiz, x: e.clientX, y: e.clientY })
  }

  const alternarRecolhido = (id: string) => {
    setRecolhidos((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const recolherTodos = (recolher: boolean) => {
    setRecolhidos(recolher ? new Set(raizes.map((r) => r.id)) : new Set())
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      {/* Scroll próprio em lg: as duas colunas ficam sempre visíveis lado a lado. */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Nossa estrutura</h2>
        {raizes.map((raiz) => (
          <RaizCard
            key={raiz.id}
            raiz={raiz}
            subgrupos={conc.estrutura.filter((n) => n.paiId === raiz.id)}
            mapa={conc.mapa}
            porChave={porChave}
            recolhido={recolhidos.has(raiz.id)}
            onAlternarRecolhido={alternarRecolhido}
            permiteRegime={props.entidade === 'categoria'}
            onAddSub={(nome, regime) => onAddNo(nome, raiz.id, regime)}
            onRemoveNo={onRemoveNo}
            onMapear={onMapear}
            onDesmapear={onDesmapear}
            onContextItem={abrirItem(true)}
            onContextNo={abrirNo}
          />
        ))}
      </div>

      <AConciliar
        itens={naoConciliados}
        estrutura={conc.estrutura}
        termo={termo}
        sugerir={sugerir}
        onMapear={onMapear}
        onDesmapear={onDesmapear}
        onContextItem={abrirItem(false)}
      />

      {menu ? (
        <MenuContexto
          alvo={menu}
          entidade={props.entidade}
          estrutura={conc.estrutura}
          mapa={conc.mapa}
          porChave={porChave}
          sugerir={sugerir}
          recolhidos={recolhidos}
          onMapear={onMapear}
          onDesmapear={onDesmapear}
          onRemoveNo={onRemoveNo}
          onRenomearNo={props.onRenomearNo}
          onDefinirRegime={props.onDefinirRegime}
          onVerMovimentos={props.onVerMovimentos}
          onAlternarRecolhido={alternarRecolhido}
          onRecolherTodos={recolherTodos}
          onFechar={() => setMenu(null)}
        />
      ) : null}
    </div>
  )
}

export type { ItemConc }
