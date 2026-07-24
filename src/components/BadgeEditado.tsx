import { useProvedor } from '@/lib/clientes'

/** Marca visual de valor ajustado pela AG, com o original do ERP no tooltip. */
export function BadgeEditado({ original }: { original: string }) {
  const { nome: provedor } = useProvedor()
  return (
    <span
      className="rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-medium text-warn"
      title={`Original ${provedor}: ${original}`}
    >
      editado
    </span>
  )
}
