/** @file Seletor segmentado (tabs) genérico. */
export interface OpcaoSeg<T extends string> {
  readonly id: T
  readonly rotulo: string
}

interface Props<T extends string> {
  readonly opcoes: readonly OpcaoSeg<T>[]
  readonly valor: T
  readonly onTrocar: (v: T) => void
}

/** Controle segmentado (toggle) padrão AG — reusado em todas as abas. */
export function Segmento<T extends string>({ opcoes, valor, onTrocar }: Props<T>) {
  return (
    <div className="flex gap-1 self-start rounded-lg border border-bd bg-surface p-1">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onTrocar(o.id)}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            o.id === valor ? 'bg-primary text-white' : 'text-muted hover:text-text'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}
