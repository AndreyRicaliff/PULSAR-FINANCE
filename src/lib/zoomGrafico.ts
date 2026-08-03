/**
 * @file Zoom/pan de gráfico por viewBox — análise de perto sem biblioteca.
 *
 * Escala o viewBox (não o CSS): texto e traço continuam nítidos em qualquer aproximação, e
 * a geometria do gráfico não muda (nenhum componente precisa recalcular nada). A roda
 * amplia ONDE o ponteiro está (não no centro), o arraste navega, e a janela é presa ao
 * desenho para o gráfico nunca "fugir" da tela.
 */
import { useCallback, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'

const MIN = 1
const MAX = 8

interface Janela {
  readonly z: number
  readonly x: number
  readonly y: number
}

export interface ZoomGrafico {
  readonly viewBox: string
  readonly nivel: number
  readonly ativo: boolean
  readonly arrastando: boolean
  readonly aoRolar: (e: WheelEvent<SVGSVGElement>) => void
  readonly aoArrastarInicio: (e: PointerEvent<SVGSVGElement>) => void
  readonly aoArrastar: (e: PointerEvent<SVGSVGElement>) => void
  readonly aoArrastarFim: (e: PointerEvent<SVGSVGElement>) => void
  readonly aproximar: () => void
  readonly afastar: () => void
  readonly reset: () => void
}

/** `largura`/`altura` são as do viewBox natural do gráfico. */
export function useZoomGrafico(largura: number, altura: number, habilitado = true): ZoomGrafico {
  const [j, setJ] = useState<Janela>({ z: 1, x: 0, y: 0 })
  const [arrastando, setArrastando] = useState(false)
  const ref = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  const prender = useCallback(
    (x: number, y: number, z: number): Janela => ({
      z,
      x: Math.min(Math.max(x, 0), largura - largura / z),
      y: Math.min(Math.max(y, 0), altura - altura / z),
    }),
    [largura, altura],
  )

  /** `foco` em fração do viewport (0..1); ausente = centro. */
  const zoomPara = useCallback(
    (fator: number, foco?: { fx: number; fy: number }) => {
      setJ((a) => {
        const z = Math.min(MAX, Math.max(MIN, a.z * fator))
        if (z === a.z) return a
        const fx = foco?.fx ?? 0.5
        const fy = foco?.fy ?? 0.5
        // Ponto do desenho sob o ponteiro antes do zoom — ele precisa continuar lá depois.
        const alvoX = a.x + fx * (largura / a.z)
        const alvoY = a.y + fy * (altura / a.z)
        return prender(alvoX - fx * (largura / z), alvoY - fy * (altura / z), z)
      })
    },
    [largura, altura, prender],
  )

  const aoRolar = useCallback(
    (e: WheelEvent<SVGSVGElement>) => {
      if (!habilitado) return
      e.preventDefault()
      const r = e.currentTarget.getBoundingClientRect()
      zoomPara(e.deltaY < 0 ? 1.25 : 0.8, { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height })
    },
    [habilitado, zoomPara],
  )

  const aoArrastarInicio = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (!habilitado || j.z <= 1) return
      e.currentTarget.setPointerCapture(e.pointerId)
      ref.current = { px: e.clientX, py: e.clientY, ox: j.x, oy: j.y }
      setArrastando(true)
    },
    [habilitado, j],
  )

  const aoArrastar = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      const p = ref.current
      if (!p) return
      const r = e.currentTarget.getBoundingClientRect()
      const dx = ((e.clientX - p.px) / r.width) * (largura / j.z)
      const dy = ((e.clientY - p.py) / r.height) * (altura / j.z)
      setJ(prender(p.ox - dx, p.oy - dy, j.z))
    },
    [largura, altura, j.z, prender],
  )

  const aoArrastarFim = useCallback((e: PointerEvent<SVGSVGElement>) => {
    ref.current = null
    setArrastando(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  const reset = useCallback(() => setJ({ z: 1, x: 0, y: 0 }), [])
  const aproximar = useCallback(() => zoomPara(1.5), [zoomPara])
  const afastar = useCallback(() => zoomPara(1 / 1.5), [zoomPara])

  const viewBox = useMemo(
    () => `${j.x.toFixed(2)} ${j.y.toFixed(2)} ${(largura / j.z).toFixed(2)} ${(altura / j.z).toFixed(2)}`,
    [j, largura, altura],
  )

  return { viewBox, nivel: j.z, ativo: j.z > 1, arrastando, aoRolar, aoArrastarInicio, aoArrastar, aoArrastarFim, aproximar, afastar, reset }
}
