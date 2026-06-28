import { montarEstruturaCentros, type DepartamentosSeed } from '@/core/centros'
import type { No } from '@/core/modelo'

// Seed vazio: departamentos vêm do Supabase em runtime (JSON real fica fora do git).
export const departamentosSeed: DepartamentosSeed = { geradoEm: '', departamentos: [] }

/** Estrutura padrão da dimensão centros, semeada do cadastro Omie. */
export const ESTRUTURA_CENTROS: readonly No[] = montarEstruturaCentros(departamentosSeed.departamentos)
