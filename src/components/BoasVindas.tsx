/** @file Overlay de boas-vindas Pulsar: anéis de pulso + marca respirando + thump grave — 1×/sessão. */
import { useEffect, useState } from 'react'
import { somPulso } from '@/lib/som'
import { LogoMark, Tagline, Wordmark } from './Logo.tsx'

const CHAVE = 'pulsar-boot-visto'

export function BoasVindas() {
  const [visivel, setVisivel] = useState(
    () => !sessionStorage.getItem(CHAVE) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    if (!visivel) return
    somPulso()
    const sair = setTimeout(() => setSaindo(true), 1400)
    const fim = setTimeout(() => {
      sessionStorage.setItem(CHAVE, '1')
      setVisivel(false)
    }, 1900)
    return () => {
      clearTimeout(sair)
      clearTimeout(fim)
    }
  }, [visivel])

  if (!visivel) return null
  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-bg transition-opacity duration-500 ${saindo ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="pulso-halo pointer-events-none absolute inset-0" />
      <div className="pulso-aneis">
        <span />
        <span />
        <span />
      </div>
      <div className="relative flex flex-col items-center gap-4">
        <span className="pulso-respira">
          <LogoMark size={72} />
        </span>
        <Wordmark classe="text-3xl" />
        <Tagline />
        <p className="text-[11px] font-medium uppercase tracking-[3px] text-muted">AG Consultoria</p>
      </div>
    </div>
  )
}
