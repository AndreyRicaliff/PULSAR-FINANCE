/** @file Etiqueta compacta Entrada/Saída pela natureza da categoria (só visual). */
import type { Natureza } from '@/core/categoria'

/**
 * Entrada = receita (dinheiro que entra), Saída = despesa (dinheiro que sai). Transferência e
 * "outra" não são nenhum dos dois (Regra Mãe) → sem etiqueta. Fonte é a natureza do plano de
 * contas, não o sinal do total (o valor é magnitude; o sinal vem da natureza).
 */
export function EtiquetaFluxo({ natureza }: { natureza?: Natureza }) {
  if (natureza === 'receita') return <Pill texto="Entrada" entra />
  if (natureza === 'despesa') return <Pill texto="Saída" entra={false} />
  return null
}

function Pill({ texto, entra }: { texto: string; entra: boolean }) {
  const cls = entra ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'
  return (
    <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold leading-none ${cls}`}>
      {texto}
    </span>
  )
}
