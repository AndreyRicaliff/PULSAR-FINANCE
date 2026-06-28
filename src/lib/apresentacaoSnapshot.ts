/** @file Snapshot da Apresentação: dados embutidos no HTML offline + leitura do global injetado. */
import type { Tenant } from '@/core/tenant'

export interface SnapshotApresentacao {
  /** Cliente ativo no momento do export. */
  readonly clienteAtivoId: string
  /** Linhas de painel_clientes (lista de tenants). */
  readonly clientes: readonly Tenant[]
  /** Todas as linhas de painel_estado do cliente: chave → dados (movimentos, modelo, demos…). */
  readonly estado: Readonly<Record<string, unknown>>
  readonly geradoEm: string
  /** Período pré-selecionado: o app exportado abre os relatórios já filtrados nele. */
  readonly periodo?: { readonly inicio: string | null; readonly fim: string | null }
}

declare global {
  interface Window {
    __AG_SNAPSHOT__?: SnapshotApresentacao
  }
}

/** Snapshot injetado no HTML exportado (presente só no modo Apresentação offline). */
export function snapshotApresentacao(): SnapshotApresentacao | null {
  return typeof window !== 'undefined' ? (window.__AG_SNAPSHOT__ ?? null) : null
}

/** true quando rodando dentro do HTML de apresentação exportado (sem rede, read-only). */
export const MODO_APRESENTACAO = snapshotApresentacao() !== null
