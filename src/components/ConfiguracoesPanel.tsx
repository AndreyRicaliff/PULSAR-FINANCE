/** @file Painel de configurações: sincronização e preferências. */
import { useState } from 'react'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'
import { Sincronizar } from './config/Sincronizar.tsx'

type VistaConfig = 'sincronizar'

const VISTAS: readonly OpcaoSeg<VistaConfig>[] = [{ id: 'sincronizar', rotulo: 'Sincronizar' }]

export function ConfiguracoesPanel() {
  const [vista, setVista] = useState<VistaConfig>('sincronizar')
  return (
    <div className="flex flex-col gap-6">
      <Segmento opcoes={VISTAS} valor={vista} onTrocar={setVista} />
      {vista === 'sincronizar' ? <Sincronizar /> : null}
    </div>
  )
}
