/**
 * @file Histórico de sincronizações Omie: cada entrada compara a versão recebida com a
 * anterior (diff feito server-side na edge function). Entrada expansível mostra novos,
 * atualizados (campo a campo, de → para) e removidos — truncamento sempre sinalizado.
 */
import { useState } from 'react'
import type { EntradaSync, ListaCapada, MovAtualizado, ResumoMov } from '@/core/sync-historico'
import { dataHora } from '@/lib/datas'
import { brl } from '@/lib/money'

const ROTULO_CAMPO: Readonly<Record<string, string>> = {
  valorCentavos: 'Valor',
  valorPagoCentavos: 'Valor pago',
  valorAbertoCentavos: 'Valor em aberto',
  jurosCentavos: 'Juros',
  multaCentavos: 'Multa',
  descontoCentavos: 'Desconto',
  status: 'Status',
  liquidado: 'Liquidado',
}

function valorCampo(campo: string, v: string | number): string {
  if (campo.endsWith('Centavos') && typeof v === 'number') return brl(v)
  return v === '' || v === undefined ? '—' : String(v)
}

export function HistoricoSync({ historico }: { historico: readonly EntradaSync[] }) {
  if (historico.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-bd p-5 text-center text-sm text-muted">
        O histórico começa na próxima sincronização.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {historico.map((e) => (
        <Entrada key={e.em} entrada={e} />
      ))}
    </div>
  )
}

function Entrada({ entrada }: { entrada: EntradaSync }) {
  const [aberta, setAberta] = useState(false)
  const { contagens: c } = entrada
  const semMudanca = c.novos + c.atualizados + c.removidos === 0
  return (
    <div className="rounded-card border border-bd bg-surface">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface2/40"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="inline-block text-[10px] text-muted" style={{ transform: aberta ? 'none' : 'rotate(-90deg)' }}>
            ▼
          </span>
          {dataHora(entrada.em)}
          {entrada.primeira ? (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-medium text-secondary">1ª sync · base criada</span>
          ) : null}
        </span>
        <span className="flex items-center gap-3 text-xs tabular-nums">
          {semMudanca ? <span className="text-muted">sem mudanças</span> : null}
          <Contagem rotulo="novos" valor={c.novos} cor="text-accent" />
          <Contagem rotulo="atualizados" valor={c.atualizados} cor="text-secondary" />
          <Contagem rotulo="removidos" valor={c.removidos} cor="text-danger" />
          <span className="text-muted">{entrada.total} no total</span>
        </span>
      </button>
      {aberta ? <Detalhes entrada={entrada} /> : null}
    </div>
  )
}

function Contagem({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <span className={valor > 0 ? cor : 'text-muted/60'}>
      <strong>{valor}</strong> {rotulo}
    </span>
  )
}

function Detalhes({ entrada }: { entrada: EntradaSync }) {
  const { detalhes: d, primeira } = entrada
  if (primeira) {
    return (
      <p className="border-t border-bd px-4 py-3 text-xs text-muted">
        Primeira sincronização deste cliente — {entrada.total} movimentos formaram a base. Diffs aparecem a partir da próxima.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-4 border-t border-bd px-4 py-3">
      <BlocoMovs titulo="Novos" cor="text-accent" lista={d.novos} />
      <BlocoAtualizados lista={d.atualizados} />
      <BlocoMovs titulo="Removidos" cor="text-danger" lista={d.removidos} />
    </div>
  )
}

function BlocoMovs({ titulo, cor, lista }: { titulo: string; cor: string; lista: ListaCapada<ResumoMov> }) {
  if (lista.total === 0) return null
  return (
    <div>
      <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${cor}`}>{titulo}</p>
      <table className="w-full text-xs">
        <tbody>
          {lista.itens.map((m, i) => (
            <tr key={`${m.documento}-${i}`} className="border-b border-bd/40 last:border-0">
              <td className="py-1 pr-2 text-muted">{m.data || '—'}</td>
              <td className="max-w-0 truncate py-1 pr-2" title={`${m.documento} · ${m.contraparte}`}>
                {m.documento || m.contraparte || 'sem documento'}
              </td>
              <td className="py-1 pr-2 text-muted">{m.categoria}</td>
              <td className={`py-1 text-right tabular-nums ${m.natureza.toUpperCase() === 'R' ? 'text-accent' : 'text-danger'}`}>
                {brl(m.valorCentavos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Truncado lista={lista} />
    </div>
  )
}

function BlocoAtualizados({ lista }: { lista: ListaCapada<MovAtualizado> }) {
  if (lista.total === 0) return null
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary">Atualizados</p>
      <div className="flex flex-col gap-2">
        {lista.itens.map((a, i) => (
          <div key={`${a.mov.documento}-${i}`} className="rounded-lg bg-surface2/40 px-3 py-2">
            <p className="truncate text-xs font-medium" title={a.mov.contraparte}>
              {a.mov.documento || a.mov.contraparte || 'sem documento'}
              <span className="ml-2 font-normal text-muted">{a.mov.categoria} · {a.mov.data}</span>
            </p>
            {a.mudancas.map((m) => (
              <p key={m.campo} className="mt-0.5 text-xs tabular-nums text-muted">
                {ROTULO_CAMPO[m.campo] ?? m.campo}: <span className="line-through">{valorCampo(m.campo, m.de)}</span>{' '}
                <span className="text-text">→ {valorCampo(m.campo, m.para)}</span>
              </p>
            ))}
          </div>
        ))}
      </div>
      <Truncado lista={lista} />
    </div>
  )
}

function Truncado({ lista }: { lista: ListaCapada<unknown> }) {
  if (!lista.truncado) return null
  return (
    <p className="mt-1 text-[11px] text-warn">
      Mostrando {lista.itens.length} de {lista.total} — detalhe completo fica na Omie.
    </p>
  )
}
