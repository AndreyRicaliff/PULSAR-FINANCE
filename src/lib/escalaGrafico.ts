/**
 * @file Fator de ampliação VERTICAL dos gráficos adaptativos (1 = card normal).
 *
 * O modal do GraficoExpansivel fornece um fator > 1 (visão "de perto" + zoom); cada
 * gráfico multiplica a própria altura-base por ele e se REDESENHA — eixo, gridlines e
 * rótulos se recalculam no novo espaço. Substitui o antigo hack CSS `[&_svg]:!h-[55vh]`,
 * que impunha uma altura de fora e garantia letterbox (aspecto do box ≠ do viewBox).
 */
import { createContext, useContext } from 'react'

export const CtxEscalaGrafico = createContext(1)

export function useEscalaGrafico(): number {
  return useContext(CtxEscalaGrafico)
}
