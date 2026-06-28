/**
 * @file Centros de custo / filiais (departamentos da Omie) → estrutura da dimensão
 * `centros` do Modelo. A hierarquia da Omie tem até 5 níveis (estrutura '001.003.004.…');
 * nossa estrutura tem 2 (grupo → subgrupo): nível '001.xxx' vira grupo e qualquer
 * descendente vira subgrupo dele. Id do nó = `dep:<codigo>` (estável: quando o lançamento
 * vier rateado da Omie, o match é direto, sem de-para).
 */
import type { No } from './modelo'

export interface Departamento {
  readonly codigo: string
  readonly descricao: string
  /** Posição hierárquica Omie, ex. '001.003.004.001.001'. */
  readonly estrutura: string
  readonly inativo: boolean
}

export interface DepartamentosSeed {
  readonly geradoEm: string
  readonly departamentos: readonly Departamento[]
}

export const SEM_FILIAL: No = { id: 'sem_filial', nome: 'Sem filial / Compartilhado', paiId: null }

export const idDep = (codigo: string): string => `dep:${codigo}`

const nivel = (estrutura: string): number => estrutura.split('.').length

const grupoDe = (estrutura: string): string => estrutura.split('.').slice(0, 2).join('.')

/**
 * Achata o cadastro Omie nos 2 níveis do Modelo. Raiz ('001' = a empresa) sai; inativos
 * saem; descendente sem grupo correspondente é promovido a grupo (não some em silêncio).
 */
export function montarEstruturaCentros(departamentos: readonly Departamento[]): No[] {
  const ativos = departamentos.filter((d) => !d.inativo && d.estrutura !== '')
  const grupos = ativos.filter((d) => nivel(d.estrutura) === 2)
  const grupoPorEstrutura = new Map(grupos.map((g) => [g.estrutura, g]))
  const nos: No[] = grupos.map((g) => ({ id: idDep(g.codigo), nome: g.descricao, paiId: null }))
  for (const d of ativos) {
    if (nivel(d.estrutura) < 3) continue
    const pai = grupoPorEstrutura.get(grupoDe(d.estrutura))
    nos.push({ id: idDep(d.codigo), nome: d.descricao, paiId: pai ? idDep(pai.codigo) : null })
  }
  nos.push(SEM_FILIAL)
  return nos
}
