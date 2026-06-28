/** @file Auto-scroll da página durante drag-and-drop nativo. */
import { useEffect } from 'react'

const ZONA = 110 // px da borda do viewport onde a rolagem começa
const VEL_MAX = 24 // px por frame no limite da borda

/**
 * Rola a página enquanto se arrasta perto do topo/base do viewport — o drag nativo do
 * HTML5 não faz auto-scroll. Quem rola aqui é a janela (o layout cresce com o conteúdo).
 * Listener em CAPTURE para sobreviver ao stopPropagation dos DropZones; rAF mantém a
 * rolagem contínua mesmo com o cursor parado na borda (dragover só dispara ao mover).
 */
export function useAutoScrollDrag(): void {
  useEffect(() => {
    const doc = document.scrollingElement ?? document.documentElement
    let vy = 0
    let raf = 0
    const loop = () => {
      doc.scrollTop += vy
      raf = vy !== 0 ? requestAnimationFrame(loop) : 0
    }
    const onOver = (e: DragEvent) => {
      const h = window.innerHeight
      const y = e.clientY
      if (y < ZONA) vy = -VEL_MAX * Math.min(1, (ZONA - y) / ZONA)
      else if (y > h - ZONA) vy = VEL_MAX * Math.min(1, (y - (h - ZONA)) / ZONA)
      else vy = 0
      if (vy !== 0 && !raf) raf = requestAnimationFrame(loop)
    }
    const parar = () => {
      vy = 0
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    window.addEventListener('dragover', onOver, true)
    window.addEventListener('drop', parar, true)
    window.addEventListener('dragend', parar, true)
    return () => {
      window.removeEventListener('dragover', onOver, true)
      window.removeEventListener('drop', parar, true)
      window.removeEventListener('dragend', parar, true)
      parar()
    }
  }, [])
}
