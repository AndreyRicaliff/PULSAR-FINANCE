/** @file Seletor segmentado (tabs) genérico. */
export interface OpcaoSeg<T extends string> {
  readonly id: T
  readonly rotulo: string
  /**
   * Explicação em hover/leitor de tela. Existe porque rótulo técnico (DFC, AV/AH) é preciso
   * para quem é da área e opaco para quem não é — a dica paga a precisão sem diluir o nome.
   */
  readonly dica?: string
}

interface Props<T extends string> {
  readonly opcoes: readonly OpcaoSeg<T>[]
  readonly valor: T
  readonly onTrocar: (v: T) => void
}

/** Controle segmentado (toggle) padrão AG — reusado em todas as abas. */
export function Segmento<T extends string>({ opcoes, valor, onTrocar }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-1 self-start rounded-lg border border-bd bg-surface p-1">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onTrocar(o.id)}
          aria-pressed={o.id === valor}
          title={o.dica}
          className={`mk-tab fx-press ${o.id === valor ? 'mk-tab--ativa' : ''}`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}
