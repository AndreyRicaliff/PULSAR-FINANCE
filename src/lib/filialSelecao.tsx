/**
 * @file Seleção de filial POR MOVIMENTO no detalhamento. O rateio real da Omie chega
 * pronto no sync e é inalterável aqui (fonte de verdade do ERP); o select só existe
 * para movimentos sem rateio, gravando override no mapa da dimensão centros.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { chaveMovFilial, mapaAuto, resolverFilial, type FilialResolvida } from '@/core/filial'
import { opcoesDaEstrutura, type OpcaoNo } from '@/core/modelo'
import type { Movimento } from '@/core/movimento'
import { useCadastros } from './cadastros'
import { useMovimentos } from './movimentos'
import { useModelo } from './useModelo'

export type OpcaoFilial = OpcaoNo

export interface FilialSelecaoApi {
  readonly opcoes: readonly OpcaoFilial[]
  /** Cascata: rateio Omie > manual > herdada da contraparte > null. */
  readonly resolver: (m: Movimento) => FilialResolvida | null
  readonly nomeDe: (noId: string) => string
  readonly atribuir: (m: Movimento, noId: string) => void
}

const Ctx = createContext<FilialSelecaoApi | null>(null)

export function FilialSelecaoProvider({ children }: { children: ReactNode }) {
  const { modelo, mapear, desmapear } = useModelo()
  const { movimentos: todos } = useMovimentos()
  const { nomesContrapartes } = useCadastros()
  const centros = modelo.centros

  const api = useMemo<FilialSelecaoApi>(() => {
    const nomes = new Map(centros.estrutura.map((n) => [n.id, n.nome]))
    // Herança calculada sobre TODOS os movimentos do cliente, não só os da tabela aberta;
    // inclui o casamento por nome contraparte↔filial (ex.: cliente EMBASA → filial Embasa).
    const auto = mapaAuto(todos, centros, nomesContrapartes)
    return {
      opcoes: opcoesDaEstrutura(centros.estrutura),
      resolver: (m) => resolverFilial(m, centros, auto),
      nomeDe: (noId) => nomes.get(noId) ?? noId,
      atribuir: (m, noId) => {
        const chave = chaveMovFilial(m)
        if (noId) mapear('centros', chave, noId)
        else desmapear('centros', chave)
      },
    }
  }, [todos, centros, mapear, desmapear, nomesContrapartes])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/** null fora do provider — quem renderiza decide esconder a coluna. */
export function useFilialSelecao(): FilialSelecaoApi | null {
  return useContext(Ctx)
}
