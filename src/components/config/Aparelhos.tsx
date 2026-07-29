/**
 * @file Aparelhos confiáveis: lista os que pulam o código e permite revogar.
 *
 * Revogar é a peça que fecha o recurso — sem ela, um notebook roubado continuaria
 * entrando sem código por 30 dias e não haveria botão nenhum para cortar. A RLS deixa
 * o dono apagar as próprias linhas, então o DELETE sai daqui mesmo, sem edge.
 */
import { useCallback, useEffect, useState } from 'react'
import { aparelhoLembrado, esquecerAparelho } from '@/lib/doisFatores'
import { supabase } from '@/lib/supabase'

interface Aparelho {
  readonly id: string
  readonly rotulo: string
  readonly criado_em: string
  readonly expira_em: string
  readonly ultimo_uso_em: string | null
}

const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export function Aparelhos() {
  const [lista, setLista] = useState<readonly Aparelho[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    if (!supabase) return setCarregando(false)
    const { data: linhas, error } = await supabase
      .from('painel_dispositivos_confiaveis')
      .select('id, rotulo, criado_em, expira_em, ultimo_uso_em')
      .order('criado_em', { ascending: false })
    if (error) setErro(error.message)
    setLista((linhas ?? []) as Aparelho[])
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function revogar(id: string) {
    if (!supabase) return
    setErro('')
    const { error } = await supabase.from('painel_dispositivos_confiaveis').delete().eq('id', id)
    if (error) return setErro(error.message)
    // Se revoguei ESTE aparelho, o segredo local vira lixo — apaga para o próximo boot
    // pedir o código em vez de tentar um token que o servidor já não conhece.
    if (lista.length === 1 && aparelhoLembrado()) esquecerAparelho()
    await carregar()
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <header>
        <h1 className="text-[19px] font-semibold">Aparelhos confiáveis</h1>
        <p className="text-sm text-muted">
          Aparelhos que já passaram pelo código e entram direto por 30 dias. Revogar faz o
          aparelho pedir o código de novo no próximo acesso.
        </p>
      </header>

      {erro ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">{erro}</p>
      ) : null}

      {carregando ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-6 text-center text-sm text-muted">
          Nenhum aparelho confiável. Marque “Confiar neste aparelho” ao digitar o código.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bd bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.rotulo}</p>
                <p className="text-xs text-muted">
                  Confiado em {data(a.criado_em)} · expira em {data(a.expira_em)} · último acesso{' '}
                  {data(a.ultimo_uso_em)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void revogar(a.id)}
                className="fx-press rounded-lg border border-bd px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-danger hover:text-danger"
              >
                Revogar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
