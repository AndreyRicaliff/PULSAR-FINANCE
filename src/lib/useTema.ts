/** @file Tema dark/light (dark-first) persistido. */
import { useCallback, useEffect, useState } from 'react'

export type Tema = 'dark' | 'light'

const CHAVE = 'lumen-tema'

function inicial(): Tema {
  const salvo = localStorage.getItem(CHAVE)
  if (salvo === 'dark' || salvo === 'light') return salvo
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function aplicar(tema: Tema): void {
  const html = document.documentElement
  html.classList.toggle('light', tema === 'light')
  html.classList.toggle('dark', tema === 'dark')
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
