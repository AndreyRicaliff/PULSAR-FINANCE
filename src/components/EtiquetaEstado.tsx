/** @file Etiqueta (pill) do estado embutido no nome pelo time BPO — excluído/inativo etc. */
import { ROTULO_ESTADO, type EstadoRegistro } from '@/core/estadoRegistro'

// CONTORNADO de propósito (UX 03/08): natureza é chip PREENCHIDO — mesma cor nunca mais
// se confunde entre as duas famílias (estado = flag de cadastro; natureza = taxonomia).
const COR: Readonly<Record<EstadoRegistro, string>> = {
  excluido: 'border border-danger/40 text-danger',
  inativo: 'border border-warn/40 text-warn',
  desativado: 'border border-warn/40 text-warn',
  'nao-usar': 'border border-warn/40 text-warn',
  obsoleto: 'border border-warn/40 text-warn',
}

export function EtiquetaEstado({ estado }: { estado: EstadoRegistro }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${COR[estado]}`}
      title={`Estado "${ROTULO_ESTADO[estado]}" — vem do cadastro do ERP (inativa/código removido) ou de marcação no nome; renomear (✎) com/sem o marcador controla a etiqueta manual`}
    >
      {ROTULO_ESTADO[estado]}
    </span>
  )
}
