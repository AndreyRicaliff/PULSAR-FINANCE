/** @file Etiqueta compacta: em quais demonstrações (DRE/DFC) a categoria/nó entra. Regime herda da raiz. */
import type { MetaContabil } from '@/core/modelo'
import { demonstracoesDoNo } from '@/core/modelo'

export function EtiquetaRegime({ meta, metaRaiz }: { meta?: MetaContabil; metaRaiz?: MetaContabil }) {
  const { dre, dfc, neutra } = demonstracoesDoNo(meta, metaRaiz)
  if (neutra) return <Pill texto="Neutra" tom="muted" />
  if (!dre && !dfc) return null
  return (
    <span className="inline-flex shrink-0 gap-1">
      {dre ? <Pill texto="DRE" tom="dre" /> : null}
      {dfc ? <Pill texto="DFC" tom="dfc" /> : null}
    </span>
  )
}

function Pill({ texto, tom }: { texto: string; tom: 'dre' | 'dfc' | 'muted' }) {
  const cls =
    tom === 'dre'
      ? 'bg-primary/15 text-secondary'
      : tom === 'dfc'
        ? 'bg-accent/15 text-accent'
        : 'bg-surface2 text-muted'
  return (
    <span className={`rounded px-1 py-0.5 text-[10px] font-semibold leading-none ${cls}`} title={`Entra na ${texto}`}>
      {texto}
    </span>
  )
}
