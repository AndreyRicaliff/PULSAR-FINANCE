/** @file Aba Sincronizar: dispara o sync manual da Omie (edge function) e mostra o histórico de execuções. */
import { useEffect, useRef } from 'react'
import { useClientes } from '@/lib/clientes'
import { dataHora } from '@/lib/datas'
import { useCadastros } from '@/lib/cadastros'
import { useMovimentos } from '@/lib/movimentos'
import { somSucesso } from '@/lib/som'
import { useSync } from '@/lib/useSync'
import { HistoricoSync } from './HistoricoSync.tsx'

export function Sincronizar() {
  const { ativo } = useClientes()
  const sync = useSync(ativo.id, ativo.nome)
  const { recarregar } = useMovimentos()
  const { recarregar: recarregarCadastros } = useCadastros()
  const rodando = sync.status === 'rodando'

  // Acorde de pulso + recarga dos movimentos quando o sync conclui (só na transição
  // rodando→ok, nunca no mount) — é o que faz o dado novo entrar nas estatísticas sem F5.
  const statusAnterior = useRef(sync.status)
  useEffect(() => {
    if (statusAnterior.current === 'rodando' && sync.status === 'ok') {
      somSucesso()
      void recarregar()
      void recarregarCadastros()
    }
    statusAnterior.current = sync.status
  }, [sync.status, recarregar, recarregarCadastros])

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Sincronizar</h1>
        <p className="text-sm text-muted">
          Atualização manual dos dados da Omie para <strong className="text-text">{ativo.nome}</strong>.
          Atualiza só os valores; classificações e edições da estrutura são preservadas. Registros novos
          entram em “A conciliar”.
        </p>
      </header>

      <div className="rounded-card border border-bd bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Dados da Omie</p>
            <p className="text-xs text-muted">
              {sync.ultimo ? `Última sincronização: ${dataHora(sync.ultimo.em)}` : 'Ainda não sincronizado'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void sync.sincronizar()}
            disabled={rodando}
            className="fx-sheen fx-press rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {rodando ? (
              <span className="flex items-center gap-2">
                <svg className="anim-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                  <path d="M21 12a9 9 0 1 1-6.2-8.56" />
                </svg>
                Sincronizando…
              </span>
            ) : (
              'Sincronizar agora'
            )}
          </button>
        </div>

        {rodando ? <Progresso etapa={sync.etapa} /> : null}
        {sync.status === 'ok' && sync.ultimo ? <Resultado novos={sync.ultimo.novos} atualizados={sync.ultimo.atualizados} /> : null}
        {sync.status === 'erro' ? <p className="mt-4 text-sm text-danger">{sync.msg}</p> : null}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Histórico de sincronizações
        </h2>
        <HistoricoSync historico={sync.historico} />
      </section>

      <p className="text-xs text-muted">
        Antes usávamos sync automático diário — pesado e desnecessário. Agora a atualização é sob
        demanda, por cliente.
      </p>
    </div>
  )
}

function Progresso({ etapa }: { etapa: string }) {
  return (
    <div className="mt-4">
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
      <p className="mt-2 text-xs text-muted">{etapa}</p>
    </div>
  )
}

function Resultado({ novos, atualizados }: { novos: number; atualizados: number }) {
  return (
    <div className="mt-4 flex gap-3">
      <Pastilha rotulo="Atualizados" valor={atualizados} cor="text-secondary" />
      <Pastilha rotulo="Novos (a conciliar)" valor={novos} cor="text-accent" />
    </div>
  )
}

function Pastilha({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className="flex-1 rounded-lg border border-bd bg-bg px-4 py-3">
      <p className={`text-2xl font-extrabold tabular-nums ${cor}`}>{valor}</p>
      <p className="text-xs text-muted">{rotulo}</p>
    </div>
  )
}
