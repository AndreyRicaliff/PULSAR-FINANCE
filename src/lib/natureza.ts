/** @file Rótulos e cores por natureza R/P. */
import type { Natureza } from '@/core/categoria'

export const ROTULO_NATUREZA: Readonly<Record<Natureza, string>> = {
  receita: 'Receita',
  despesa: 'Despesa',
  transferencia: 'Transferência',
  outra: 'Outra',
}

export const COR_NATUREZA: Readonly<Record<Natureza, string>> = {
  receita: 'bg-accent/15 text-accent',
  despesa: 'bg-danger/15 text-danger',
  transferencia: 'bg-secondary/15 text-secondary',
  outra: 'bg-muted/15 text-muted',
}
