/**
 * @file Ficha da empresa (por cliente): informações úteis configuráveis + tema padrão
 * das apresentações. Vive no painel_estado (chave por tenant) — sincroniza, entra no
 * snapshot do HTML exportado e a RLS já governa.
 */
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
  /** id de TEMAS_APRESENTACAO; null = clássico AG. */
  readonly temaPadrao: string | null
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
  }
}

export function useFicha() {
  const chave = useChaveCliente(BASE)
  const [ficha, setFicha] = useEstadoSincronizado<FichaEmpresa>(chave, normalizar)
  const patch = (p: Partial<FichaEmpresa>) => setFicha((f) => ({ ...f, ...p }))
  return { ficha, patch }
}
