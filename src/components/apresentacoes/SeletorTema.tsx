/** @file Swatches dos temas curados — usado na ficha da empresa e no editor de apresentação. */
import { TEMAS_APRESENTACAO } from '@/core/temaApresentacao'

export function SeletorTema({
  valor,
  onTrocar,
  rotuloHeranca,
}: {
  /** id do tema; null = herdar (empresa → clássico). */
  valor: string | null
  onTrocar: (id: string | null) => void
  /** Texto do chip de herança (ex.: "Padrão da empresa"); ausente = sem opção de herdar. */
  rotuloHeranca?: string
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
      {TEMAS_APRESENTACAO.map((t) => (
        <button
          key={t.id}
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
      ))}
    </div>
  )
}
