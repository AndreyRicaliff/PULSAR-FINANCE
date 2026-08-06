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
  /**
   * Imagens da marca como data: URI, indexadas pelo caminho original ('/x.png' → 'data:…').
   * Existem porque `<img src="/…">` é criado em RUNTIME pelo React — o inliner do export
   * trabalha sobre o index.html estático e nunca as alcança. Aberto como arquivo, o
   * caminho absoluto resolve na raiz do disco e a marca some do relatório do cliente.
   */
  readonly assets?: Readonly<Record<string, string>>
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

/**
 * Caminho de imagem da marca → o data: URI embutido, quando houver. Fora do modo
 * Apresentação (e para asset que o export não alcançou) devolve o caminho original,
 * que é exatamente o comportamento de antes.
 */
export function urlAsset(caminho: string): string {
  return snapshotApresentacao()?.assets?.[caminho] ?? caminho
}
