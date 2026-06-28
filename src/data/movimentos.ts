import type { MovimentosSeed } from '@/core/movimento'

// Seed vazio: movimentos vêm do Supabase em runtime (JSON real fica fora do git).
export const movimentosSeed: MovimentosSeed = { geradoEm: '', movimentos: [] }
