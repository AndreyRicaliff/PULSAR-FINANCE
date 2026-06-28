/** @file Nome com edição inline que grava override (original Omie imutável). */
import { useState, type MouseEvent, type ReactNode } from 'react'
import type { EntidadeEditavel, NomeResolvido } from '@/core/override'
import { useOverrides } from '@/lib/overrides'
import { BadgeEditado } from './BadgeEditado.tsx'

interface Props {
  readonly entidade: EntidadeEditavel
  readonly codigo: string
  readonly resolvido: NomeResolvido
}

export function NomeEditavel({ entidade, codigo, resolvido }: Props) {
  const { renomear, restaurar } = useOverrides()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(resolvido.nome)

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
      <span title={resolvido.editado ? `Original Omie: ${resolvido.original}` : undefined}>
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
    </span>
  )
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
