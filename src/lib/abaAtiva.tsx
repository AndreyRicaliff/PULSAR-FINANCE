/**
 * @file Aba dona do modal (UX 03/08 — o "modal órfão", problema nº1 das janelas):
 * modais são portais em document.body; trocar de aba deixava o modal flutuando SOBRE a
 * aba errada. O Shell publica a aba ativa; o modal captura a dona no mount e some
 * (sem fechar — o estado do painel continua) enquanto a aba ativa for outra.
 */
import { createContext, useContext, useRef } from 'react'
import type { Aba } from '@/components/Sidebar.tsx'

export const AbaAtivaContext = createContext<Aba | null>(null)

/** true quando o modal deve aparecer (fora do Shell — HUD/apresentação — sempre true). */
export function useVisivelNaAbaDona(): boolean {
  const ativa = useContext(AbaAtivaContext)
  const dona = useRef(ativa)
  return ativa === null || ativa === dona.current
}
