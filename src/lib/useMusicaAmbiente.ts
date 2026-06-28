/**
 * @file Master de SOM da família Pulsar — chave 'pulsar-som' compartilhada com o PULSAR-RH.
 * Desligado: silencia música ambiente, efeitos de navegação e o som da intro de uma vez.
 * Ligar retoma a música ambiente junto (gesto do usuário → autoplay ok).
 */
import { useState } from 'react'
import { iniciarMusicaAmbiente, pararMusicaAmbiente, somLigado } from './som'

export function useSomMaster(): { ligado: boolean; alternar: () => void } {
  const [ligado, setLigado] = useState(somLigado())

  function alternar() {
    const novo = !ligado
    setLigado(novo)
    localStorage.setItem('pulsar-som', novo ? '1' : '0')
    localStorage.setItem('pulsar-ambient', novo ? '1' : '0')
    if (novo) iniciarMusicaAmbiente()
    else pararMusicaAmbiente()
  }

  return { ligado, alternar }
}
