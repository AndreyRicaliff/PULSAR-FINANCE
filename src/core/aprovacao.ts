/**
 * @file Aprovação de contas a pagar — tipos e a MESMA máquina de estados do banco.
 * A verdade mora no trigger (aprovacao_valida_update); este espelho existe para a UI
 * saber quais botões mostrar sem tentar uma transição que o banco vai recusar.
 */

export type StatusAprovacao = 'pendente' | 'aprovada' | 'reprovada' | 'agendada' | 'paga' | 'cancelada'

export type TipoEvento =
  | 'criacao'
  | 'comentario'
  | 'aprovacao'
  | 'reprovacao'
  | 'reabertura'
  | 'agendamento'
  | 'pagamento'
  | 'cancelamento'

export interface Aprovacao {
  readonly id: string
  readonly clienteId: string
  readonly tituloRef: string | null
  readonly fornecedor: string
  readonly descricao: string
  readonly valorCentavos: number
  /** ISO 'aaaa-mm-dd' (formato do banco). */
  readonly vencimento: string
  readonly status: StatusAprovacao
  readonly decididoEm: string | null
  readonly criadoEm: string
}

export interface EventoAprovacao {
  readonly id: string
  readonly aprovacaoId: string
  readonly autorRotulo: string
  readonly tipo: TipoEvento
  readonly texto: string
  readonly criadoEm: string
}

/** Espelho exato do trigger — transição fora daqui é exceção no banco. */
const PODE_IR: Readonly<Record<StatusAprovacao, readonly StatusAprovacao[]>> = {
  pendente: ['aprovada', 'reprovada', 'cancelada'],
  aprovada: ['agendada', 'cancelada'],
  agendada: ['paga', 'cancelada'],
  reprovada: ['pendente', 'cancelada'],
  paga: [],
  cancelada: [],
}

export function podeIr(de: StatusAprovacao, para: StatusAprovacao): boolean {
  return PODE_IR[de].includes(para)
}

export const ROTULO_STATUS: Readonly<Record<StatusAprovacao, string>> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  agendada: 'Agendada',
  paga: 'Paga',
  cancelada: 'Cancelada',
}

/** Semântica de cor do app: warn = aguardando, accent = sim, danger = não, secondary = em curso. */
export const COR_STATUS: Readonly<Record<StatusAprovacao, string>> = {
  pendente: 'bg-warn/15 text-warn',
  aprovada: 'bg-accent/15 text-accent',
  reprovada: 'bg-danger/15 text-danger',
  agendada: 'bg-secondary/15 text-secondary',
  paga: 'bg-accent/10 text-muted',
  cancelada: 'bg-muted/15 text-muted',
}

export const ROTULO_EVENTO: Readonly<Record<TipoEvento, string>> = {
  criacao: 'entrou na fila',
  comentario: 'comentou',
  aprovacao: 'aprovou',
  reprovacao: 'reprovou',
  reabertura: 'reabriu (nova rodada)',
  agendamento: 'agendou o pagamento',
  pagamento: 'confirmou o pagamento',
  cancelamento: 'cancelou',
}

/** Em aberto = ainda pede ação de alguém (o que os KPIs somam). */
export function emAberto(a: Pick<Aprovacao, 'status'>): boolean {
  return a.status === 'pendente' || a.status === 'aprovada' || a.status === 'agendada'
}
