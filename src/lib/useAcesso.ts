/**
 * @file Autorização do usuário logado: papel (operador/cliente) e tenants permitidos.
 * Fail-closed: sem vínculo em painel_acessos → 'nenhum' (sem dado). A RLS já isola no banco;
 * isto só decide o que a UI mostra (Shell do operador vs HUD do cliente). Auth off (dev) = operador.
 */
import { useEffect, useState } from 'react'
import { AUTH_ATIVO } from './auth'
import { supabase } from './supabase'

export type Papel = 'operador' | 'cliente' | 'nenhum'

export interface Acesso {
  readonly carregando: boolean
  readonly papel: Papel
  readonly clienteIds: readonly string[]
}

const OPERADOR_LOCAL: Acesso = { carregando: false, papel: 'operador', clienteIds: [] }
const CARREGANDO: Acesso = { carregando: true, papel: 'nenhum', clienteIds: [] }

export function useAcesso(userId: string | undefined): Acesso {
  const [acesso, setAcesso] = useState<Acesso>(() => (!AUTH_ATIVO || !supabase ? OPERADOR_LOCAL : CARREGANDO))

  useEffect(() => {
    if (!AUTH_ATIVO || !supabase) return setAcesso(OPERADOR_LOCAL)
    if (!userId) return setAcesso(CARREGANDO)
    let vivo = true
    void (async () => {
      const { data, error } = await supabase
        .from('painel_acessos')
        .select('papel, cliente_id')
        .eq('user_id', userId)
      if (!vivo) return
      if (error) {
        console.error('[acesso] erro ao ler papel:', error.message)
        return setAcesso({ carregando: false, papel: 'nenhum', clienteIds: [] })
      }
      const linhas = data ?? []
      const operador = linhas.some((l) => l.papel === 'operador')
      const clienteIds = linhas
        .filter((l) => l.papel === 'cliente' && l.cliente_id)
        .map((l) => String(l.cliente_id))
      const papel: Papel = operador ? 'operador' : clienteIds.length ? 'cliente' : 'nenhum'
      setAcesso({ carregando: false, papel, clienteIds })
    })()
    return () => {
      vivo = false
    }
  }, [userId])

  return acesso
}
