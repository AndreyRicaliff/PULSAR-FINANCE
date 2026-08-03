/** @file Etiqueta (pill) do estado embutido no nome pelo time BPO — excluído/inativo etc. */
import { ROTULO_ESTADO, type EstadoRegistro } from '@/core/estadoRegistro'

const COR: Readonly<Record<EstadoRegistro, string>> = {
  excluido: 'bg-danger/15 text-danger',
  inativo: 'bg-warn/15 text-warn',
  desativado: 'bg-warn/15 text-warn',
  'nao-usar': 'bg-warn/15 text-warn',
  obsoleto: 'bg-warn/15 text-warn',
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
