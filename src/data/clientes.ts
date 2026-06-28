import type { ClientesSeed } from '@/core/cliente'

// Seed vazio: clientes vêm do Supabase em runtime (JSON real fica fora do git).
export const clientesSeed: ClientesSeed = { geradoEm: '', clientes: {} }

/** código → nome, pronto para o casamento contraparte↔filial (core/filial.autoPorNome). */
export const NOMES_CONTRAPARTES: ReadonlyMap<string, string> = new Map(
  Object.entries(clientesSeed.clientes).map(([codigo, c]) => [codigo, c.nome]),
)
