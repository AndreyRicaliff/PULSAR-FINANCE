/**
 * @file Largura REAL do container do gráfico, medida com ResizeObserver.
 *
 * Os SVGs do app desenham num viewBox de largura própria; quando ela difere da largura
 * do container, o preserveAspectRatio (`meet`) ou explodia a altura (report 03/08) ou
 * encaixotava o desenho num tufo centralizado com margens gigantes. Com o px medido como
 * largura do viewBox a escala fica 1:1 por construção — o desenho preenche card, slide
 * e modal sem letterbox, e o texto SVG permanece nítido (nunca distorce).
 */
import { useLayoutEffect, useRef, useState } from 'react'

export function useLarguraGrafico<T extends HTMLElement = HTMLDivElement>(fallback = 620) {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(fallback)

  // SEM deps de propósito: re-mede a cada commit, antes do paint. É o que faz o zoom do
  // modal (que muda largura lógica + fator no MESMO commit) redesenhar já certo — e não
  // depende do ResizeObserver, que aba/pane oculto pode segurar indefinidamente.
  // setLargura com valor igual não re-renderiza (bail-out do React) — sem loop.
  useLayoutEffect(() => {
    const w = Math.round(ref.current?.clientWidth ?? 0)
    if (w > 0) setLargura(w)
  })

  // Rede pra resize que NÃO passa pelo React (janela, sidebar recolhendo, split do modal).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.clientWidth)
      if (w > 0) setLargura(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, largura }
}
