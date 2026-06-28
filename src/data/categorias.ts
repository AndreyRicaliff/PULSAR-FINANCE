import type { CategoriasSeed } from '@/core/categoria'

// Seed vazio: o app carrega as categorias do Supabase em runtime. O JSON real é gerado pelo
// sync e fica fora do git (dado de cliente) — por isso não entra no build.
export const seed: CategoriasSeed = {
  geradoEm: '',
  relatorio: { total: 0, porNatureza: { receita: 0, despesa: 0, transferencia: 0, outra: 0 }, agrupadoras: 0, analiticas: 0, inativas: 0 },
  categorias: [],
}
