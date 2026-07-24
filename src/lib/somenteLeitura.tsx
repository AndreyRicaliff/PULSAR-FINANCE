/**
 * @file Contexto de somente-leitura: marcado pelo HUD do cliente para degradar controles de
 * edição da camada semântica (renomear/override/atribuir) a texto. Fora do HUD = false (operador edita).
 */
import { createContext, useContext, type ReactNode } from 'react'

const Ctx = createContext(false)

/** Marca a subárvore como read-only (o HUD do cliente envolve todo o seu conteúdo). */
export function SomenteLeituraProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={true}>{children}</Ctx.Provider>
}

export function useSomenteLeitura(): boolean {
  return useContext(Ctx)
}
