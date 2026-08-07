/** @file Tema dark/light (dark-first) persistido. */
import { useCallback, useEffect, useState } from 'react'

export type Tema = 'dark' | 'light'

const CHAVE = 'lumen-tema'

function inicial(): Tema {
  const salvo = localStorage.getItem(CHAVE)
  if (salvo === 'dark' || salvo === 'light') return salvo
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

let timerAnima: ReturnType<typeof setTimeout> | null = null

function aplicar(tema: Tema): void {
  const html = document.documentElement
  // Portão da transição de cor: a regra global `body *` saiu do CSS (jank permanente em
  // tabela grande) e só volta durante a troca — 350ms cobre os 0.25s da transição.
  html.classList.add('tema-anima')
  html.classList.toggle('light', tema === 'light')
  html.classList.toggle('dark', tema === 'dark')
  if (timerAnima) clearTimeout(timerAnima)
  timerAnima = setTimeout(() => html.classList.remove('tema-anima'), 350)
}

export function useTema(): readonly [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(inicial)

  useEffect(() => {
    aplicar(tema)
    localStorage.setItem(CHAVE, tema)
  }, [tema])

  const alternar = useCallback(() => setTema((t) => (t === 'dark' ? 'light' : 'dark')), [])

  return [tema, alternar] as const
}
