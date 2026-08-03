/**
 * @file Fundação dos overlays (UX 03/08): Esc em PILHA e trava de scroll do body.
 *
 * Antes cada modal registrava o próprio keydown — metade não fechava com Esc e, com
 * modais empilhados (drill dentro de expandido), um Esc derrubava todos de uma vez.
 * Aqui existe UM listener global e uma pilha: Esc fecha SÓ o overlay do topo.
 */
import { useEffect, useRef } from 'react'

const pilha: { fechar: () => void }[] = []
let listenerLigado = false

function garantirListener() {
  if (listenerLigado) return
  listenerLigado = true
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || pilha.length === 0) return
    e.stopPropagation()
    pilha[pilha.length - 1]!.fechar()
  })
}

/** Registra o overlay na pilha de Esc enquanto montado. */
export function useOverlay(onFechar: () => void): void {
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    garantirListener()
    const entrada = { fechar: () => fecharRef.current() }
    pilha.push(entrada)
    return () => {
      const i = pilha.indexOf(entrada)
      if (i >= 0) pilha.splice(i, 1)
    }
  }, [])
}

let abertos = 0

/** Trava o scroll do body enquanto houver overlay aberto (conta empilhados). */
export function useTravaScroll(): void {
  useEffect(() => {
    abertos += 1
    if (abertos === 1) document.body.style.overflow = 'hidden'
    return () => {
      abertos -= 1
      if (abertos === 0) document.body.style.overflow = ''
    }
  }, [])
}
