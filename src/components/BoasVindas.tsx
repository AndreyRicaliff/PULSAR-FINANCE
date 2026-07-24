/**
 * @file Splash Pulsar — 1×/sessão. O símbolo cardíaco se DESENHA (anel + EKG), o batimento
 * assume e o overlay some: como o batimento tem FASE ÚNICA no produto (ciclo 2.6s, delay
 * 1.7s a partir do load), a marca do header já está no mesmo ponto do ciclo quando o splash
 * sai — a transição não tem corte. Halo/anéis do legado console saíram com a v3.1 (§8.7).
 */
import { useEffect, useState } from 'react'
import { MODO_ESTATICO } from '@/lib/estatico'
import { somPulso } from '@/lib/som'
import { LogoMark, Tagline, Wordmark } from './Logo.tsx'

const CHAVE = 'pulsar-boot-visto'

export function BoasVindas() {
  // Gate por ?static=1, NUNCA por prefers-reduced-motion (RDP liga sozinho — §4).
  const [visivel, setVisivel] = useState(() => !sessionStorage.getItem(CHAVE) && !MODO_ESTATICO)
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    if (!visivel) return
    somPulso()
    // Sai DEPOIS de 1.7s (instante em que o batimento entra) para fundir com o header.
    const sair = setTimeout(() => setSaindo(true), 1900)
    const fim = setTimeout(() => {
      sessionStorage.setItem(CHAVE, '1')
      setVisivel(false)
    }, 2400)
    return () => {
      clearTimeout(sair)
      clearTimeout(fim)
    }
  }, [visivel])

  if (!visivel) return null
  return (
    <div
      role="dialog"
      aria-label="Abrindo o Pulsar Finance"
      className={`fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-bg transition-opacity duration-500 ${saindo ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="relative flex flex-col items-center gap-5">
        <LogoMark size={84} intro />
        <div className="anim-fade-up flex flex-col items-center gap-2" style={{ animationDelay: '0.9s' }}>
          <Wordmark classe="text-3xl" />
          <Tagline />
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[3px] text-muted">AG Consultoria</p>
        </div>
      </div>
    </div>
  )
}
