/**
 * @file Ficha da empresa (por cliente): informações úteis configuráveis + tema padrão
 * das apresentações. Vive no painel_estado (chave por tenant) — sincroniza, entra no
 * snapshot do HTML exportado e a RLS já governa.
 */
import type { TemaApresentacao } from '@/core/temaApresentacao'
import { useChaveCliente } from './clientes'
import { useEstadoSincronizado } from './persistencia'

const BASE = 'ficha-v1'

export interface FichaEmpresa {
  readonly exibicao: string
  readonly cnpj: string
  readonly responsavel: string
  readonly email: string
  readonly telefone: string
  readonly notas: string
  /** id de tema (preset ou custom); null = padrão da casa (Pulsar). */
  readonly temaPadrao: string | null
  /** Temas criados pela empresa (nome + 2 cores; palco deriva do escuro). */
  readonly temasCustom: readonly TemaApresentacao[]
  /**
   * Logo do CLIENTE como data: URI — aparece no painel dele no lugar da marca Pulsar.
   * Data URI e não URL: o painel precisa funcionar dentro do HTML offline exportado, onde
   * link externo não resolve; e evita depender de um host que pode sair do ar depois.
   * Vazio = painel assinado pela AG, como antes.
   */
  readonly logo: string
}

function normalizar(bruto: unknown): FichaEmpresa {
  const f = (bruto ?? {}) as Partial<FichaEmpresa>
  return {
    exibicao: f.exibicao ?? '',
    cnpj: f.cnpj ?? '',
    responsavel: f.responsavel ?? '',
    email: f.email ?? '',
    telefone: f.telefone ?? '',
    notas: f.notas ?? '',
    temaPadrao: f.temaPadrao ?? null,
    temasCustom: Array.isArray(f.temasCustom) ? f.temasCustom : [],
    logo: typeof f.logo === 'string' ? f.logo : '',
  }
}

export function useFicha() {
  const chave = useChaveCliente(BASE)
  const [ficha, setFicha] = useEstadoSincronizado<FichaEmpresa>(chave, normalizar)
  const patch = (p: Partial<FichaEmpresa>) => setFicha((f) => ({ ...f, ...p }))

  // Básico de propósito: nome + acento + escuro; o palco (moldura) reusa o escuro.
  const criarTema = (nome: string, acento: string, escuro: string) => {
    const id = `custom-${Date.now().toString(36)}`
    setFicha((f) => ({ ...f, temasCustom: [...f.temasCustom, { id, nome, acento, escuro, palco: escuro }], temaPadrao: f.temaPadrao ?? id }))
  }
  const removerTema = (id: string) =>
    setFicha((f) => ({
      ...f,
      temasCustom: f.temasCustom.filter((t) => t.id !== id),
      temaPadrao: f.temaPadrao === id ? null : f.temaPadrao,
    }))

  return { ficha, patch, criarTema, removerTema }
}
