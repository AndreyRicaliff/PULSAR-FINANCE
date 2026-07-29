/**
 * @file Selo de sincronização da Topbar — o "salvou?" respondido na tela.
 * A falha é o estado que importa: fica visível e insistente até uma gravação passar,
 * porque a alternativa era o financeiro conciliar o mês com o upsert morrendo no console.
 */
import { tentarSalvarDeNovo, useEstadoSync } from '@/lib/persistencia'

const hora = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function SeloSync() {
  const s = useEstadoSync()

  if (s.estado === 'ocioso') return null

  if (s.estado === 'erro') {
    return (
      <button
        type="button"
        onClick={tentarSalvarDeNovo}
        title={`${s.falhas} alteração(ões) não gravada(s) no servidor — ficam neste navegador até salvar. Clique para tentar de novo.`}
        className="fx-press flex items-center gap-2 rounded-lg border border-danger/50 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-danger" />
        não salvo · tentar de novo
      </button>
    )
  }

  return (
    <span
      className="hidden items-center gap-2 text-xs text-muted sm:flex"
      title="Gravação automática no servidor"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.estado === 'salvando' ? 'pulso-vivo bg-warn' : 'bg-accent'}`} />
      {s.estado === 'salvando' ? 'salvando…' : `salvo ${s.ultimoSalvoEm ? hora(s.ultimoSalvoEm) : ''}`}
    </span>
  )
}
