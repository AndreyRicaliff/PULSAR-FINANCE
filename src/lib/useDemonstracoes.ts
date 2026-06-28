/** @file Estado editável das demonstrações DRE/DFC (linhas + alocação de grupos). */
import { useCallback } from 'react'
import { demonstracaoPadrao, type Demonstracao, type TipoDemo } from '@/core/demonstracao'
import { ESTRUTURA_PADRAO_AG } from '@/core/modelo'
import { useEstadoSincronizado } from './persistencia'
import { useChaveCliente } from './clientes'

const BASE_CHAVE = 'painel-ag-demonstracoes-v1'

interface Estado {
  readonly dre: Demonstracao
  readonly dfc: Demonstracao
}

function normalizar(bruto: unknown): Estado {
  const e = (bruto ?? {}) as Partial<Estado>
  return {
    dre: e.dre?.linhas?.length ? e.dre : demonstracaoPadrao('dre', ESTRUTURA_PADRAO_AG),
    dfc: e.dfc?.linhas?.length ? e.dfc : demonstracaoPadrao('dfc', ESTRUTURA_PADRAO_AG),
  }
}

export interface DemonstracoesApi {
  readonly demo: Readonly<Record<TipoDemo, Demonstracao>>
  readonly alocar: (tipo: TipoDemo, grupoId: string, linhaId: string) => void
  readonly desalocar: (tipo: TipoDemo, grupoId: string) => void
  /** Override por subgrupo: linhaId vazio remove o override (volta a seguir o grupo). */
  readonly alocarSub: (tipo: TipoDemo, subId: string, linhaId: string) => void
  /** Override por classe (código da agrupadora): linhaId vazio remove o override. */
  readonly alocarClasse: (tipo: TipoDemo, classeCod: string, linhaId: string) => void
  readonly restaurar: (tipo: TipoDemo) => void
}

export function useDemonstracoes(): DemonstracoesApi {
  const chave = useChaveCliente(BASE_CHAVE)
  const [demo, setEstado] = useEstadoSincronizado<Estado>(chave, normalizar)

  // Neutro tem default "a conciliar" (mapaPadrao não o aloca), mas é REALOCÁVEL — livre-arbítrio.
  const aplicar = useCallback((tipo: TipoDemo, fn: (d: Demonstracao) => Demonstracao) => {
    setEstado((e) => ({ ...e, [tipo]: fn(e[tipo]) }))
  }, [])

  const alocar = useCallback(
    (tipo: TipoDemo, grupoId: string, linhaId: string) => {
      aplicar(tipo, (d) => ({ ...d, mapa: { ...d.mapa, [grupoId]: linhaId } }))
    },
    [aplicar],
  )

  const desalocar = useCallback(
    (tipo: TipoDemo, grupoId: string) => {
      aplicar(tipo, (d) => ({ ...d, mapa: semChave(d.mapa, grupoId) }))
    },
    [aplicar],
  )

  const alocarSub = useCallback(
    (tipo: TipoDemo, subId: string, linhaId: string) => {
      aplicar(tipo, (d) => ({
        ...d,
        mapaSub: linhaId ? { ...(d.mapaSub ?? {}), [subId]: linhaId } : semChave(d.mapaSub ?? {}, subId),
      }))
    },
    [aplicar],
  )

  const alocarClasse = useCallback(
    (tipo: TipoDemo, classeCod: string, linhaId: string) => {
      aplicar(tipo, (d) => ({
        ...d,
        mapaClasse: linhaId ? { ...(d.mapaClasse ?? {}), [classeCod]: linhaId } : semChave(d.mapaClasse ?? {}, classeCod),
      }))
    },
    [aplicar],
  )

  const restaurar = useCallback(
    (tipo: TipoDemo) => {
      aplicar(tipo, () => demonstracaoPadrao(tipo, ESTRUTURA_PADRAO_AG))
    },
    [aplicar],
  )

  return { demo, alocar, desalocar, alocarSub, alocarClasse, restaurar }
}

function semChave(mapa: Readonly<Record<string, string>>, chave: string): Record<string, string> {
  const copia = { ...mapa }
  delete copia[chave]
  return copia
}
