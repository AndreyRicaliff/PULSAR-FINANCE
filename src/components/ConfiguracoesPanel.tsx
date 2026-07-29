/** @file Painel de configurações: sincronização e preferências. */
import { useState } from 'react'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'
import { Aparelhos } from './config/Aparelhos.tsx'
import { Sincronizar } from './config/Sincronizar.tsx'

type VistaConfig = 'sincronizar' | 'aparelhos'

const VISTAS: readonly OpcaoSeg<VistaConfig>[] = [
  { id: 'sincronizar', rotulo: 'Sincronizar' },
  { id: 'aparelhos', rotulo: 'Aparelhos confiáveis' },
]

export function ConfiguracoesPanel() {
  const [vista, setVista] = useState<VistaConfig>('sincronizar')
  return (
    <div className="flex flex-col gap-6">
      <Segmento opcoes={VISTAS} valor={vista} onTrocar={setVista} />
      {vista === 'sincronizar' ? <Sincronizar /> : null}
      {vista === 'aparelhos' ? <Aparelhos /> : null}
    </div>
  )
}
