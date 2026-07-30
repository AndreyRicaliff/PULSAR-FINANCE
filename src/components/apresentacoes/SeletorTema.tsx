/** @file Swatches dos temas (presets + custom da empresa) e o criador básico de tema. */
import { useState } from 'react'
import { TEMAS_APRESENTACAO, type TemaApresentacao } from '@/core/temaApresentacao'

export function SeletorTema({
  valor,
  onTrocar,
  rotuloHeranca,
  extras = [],
  onRemoverExtra,
}: {
  /** id do tema; null = herdar (empresa → Pulsar). */
  valor: string | null
  onTrocar: (id: string | null) => void
  /** Texto do chip de herança (ex.: "Padrão da empresa"); ausente = sem opção de herdar. */
  rotuloHeranca?: string
  /** Temas custom da empresa (ficha). */
  extras?: readonly TemaApresentacao[]
  onRemoverExtra?: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {rotuloHeranca ? (
        <button
          type="button"
          onClick={() => onTrocar(null)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            valor === null ? 'border-primary bg-primary/10 text-secondary' : 'border-bd text-muted hover:text-text'
          }`}
        >
          {rotuloHeranca}
        </button>
      ) : null}
      {[...TEMAS_APRESENTACAO, ...extras].map((t) => (
        <span key={t.id} className="flex items-center">
          <button
            type="button"
            onClick={() => onTrocar(t.id)}
            title={t.nome}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              valor === t.id ? 'border-primary bg-primary/10 text-text' : 'border-bd text-muted hover:text-text'
            }`}
          >
            <span className="flex overflow-hidden rounded-full border border-black/30">
              <span className="h-3.5 w-3.5" style={{ background: t.acento }} />
              <span className="h-3.5 w-3.5" style={{ background: t.escuro }} />
            </span>
            {t.nome}
          </button>
          {onRemoverExtra && t.id.startsWith('custom-') ? (
            <button
              type="button"
              onClick={() => onRemoverExtra(t.id)}
              title={`Excluir o tema ${t.nome}`}
              className="-ml-1 px-1 text-xs text-muted hover:text-danger"
            >
              ✕
            </button>
          ) : null}
        </span>
      ))}
    </div>
  )
}

/** Criador básico: nome + 2 cores. O palco deriva do escuro — 3 campos já fazem um tema. */
export function CriadorTema({ onCriar }: { onCriar: (nome: string, acento: string, escuro: string) => void }) {
  const [nome, setNome] = useState('')
  const [acento, setAcento] = useState('#22AA77')
  const [escuro, setEscuro] = useState('#12211B')
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-36 flex-1 flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Novo tema (nome)</span>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Marca do cliente"
          className="rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Destaque</span>
        <input type="color" value={acento} onChange={(e) => setAcento(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-bd bg-surface2" />
      </label>
      <label className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Fundo escuro</span>
        <input type="color" value={escuro} onChange={(e) => setEscuro(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-bd bg-surface2" />
      </label>
      <button
        type="button"
        disabled={!nome.trim()}
        onClick={() => {
          onCriar(nome.trim(), acento, escuro)
          setNome('')
        }}
        className="fx-press rounded-lg border border-bd px-4 py-2 text-sm font-medium text-muted hover:text-text disabled:opacity-50"
      >
        Criar tema
      </button>
    </div>
  )
}
