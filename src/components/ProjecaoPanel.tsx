/**
 * @file Previsto × Realizado — Fluxo de Caixa semanal (drill diário) por TODOS os grupos da
 * estrutura. Previsto = títulos em aberto pelo vencimento; Realizado = pagamentos efetivos.
 * Saldo inicial é entrada manual (a Omie não sincroniza saldo bancário).
 */
import { useMemo, useState } from 'react'
import { isoDeMov } from '@/core/periodo'
import { fluxoDiario, montarSemanas } from '@/core/projecao-semanal'
import { brl } from '@/lib/money'
import { useMovimentos } from '@/lib/movimentos'
import { useModelo } from '@/lib/useModelo'
import { useSaldosIniciais } from '@/lib/useSaldosIniciais'
import { useTitulos } from '@/lib/useTitulos'
import { FluxoSemanal } from './projecao/FluxoSemanal.tsx'

const mesDe = (s: string): string | null => isoDeMov(s)?.slice(0, 7) ?? null

export function ProjecaoPanel() {
  const { titulos } = useTitulos()
  const { movimentos } = useMovimentos()
  const { modelo } = useModelo()
  const { saldos, saldoDoMes, definir, remover } = useSaldosIniciais()
  const conc = modelo.contas
  const [mes, setMes] = useState('')

  const mesPadrao = useMemo(() => {
    const meses = [
      ...titulos.map((t) => mesDe(t.dataVencimento || t.dataPrevisao)),
      ...movimentos.map((m) => ((m.valorPagoCentavos ?? 0) > 0 ? mesDe(m.dataPagamento ?? '') : null)),
    ].filter((m): m is string => m !== null)
    return meses.sort().at(-1) ?? new Date().toISOString().slice(0, 7)
  }, [titulos, movimentos])

  const mesAtivo = mes || mesPadrao
  const saldoMes = saldoDoMes(mesAtivo)
  const semanas = useMemo(() => montarSemanas(mesAtivo), [mesAtivo])
  const fluxo = useMemo(() => fluxoDiario(titulos, movimentos, conc), [titulos, movimentos, conc])
  const salvos = Object.entries(saldos).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Previsto × Realizado · Fluxo de Caixa</h1>
        <p className="text-sm text-muted">
          Por semana (clique na semana para abrir os dias) e por todos os grupos da estrutura ·
          Previsto = em aberto pelo vencimento · Realizado = pagamentos efetivos
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-6 rounded-card border border-bd bg-surface p-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Mês de referência
          <input
            type="month"
            value={mesAtivo}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Saldo inicial de {mesAtivo} (R$)
          <input
            type="number"
            step="0.01"
            value={saldoMes ? saldoMes / 100 : ''}
            placeholder="0,00"
            onChange={(e) => definir(mesAtivo, Math.round((parseFloat(e.target.value) || 0) * 100))}
            className="w-40 rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
          />
          <span className="text-[10px] font-normal text-muted/70">salvo por mês · usado nos relatórios desse mês</span>
        </label>
        <div className="ml-auto text-right">
          <div className="text-xs text-muted">Saldo inicial · {mesAtivo}</div>
          <div className="text-lg font-bold tabular-nums">{brl(saldoMes)}</div>
        </div>
      </div>

      {salvos.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-card border border-bd bg-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Saldos iniciais salvos</h2>
          <div className="flex flex-wrap gap-2">
            {salvos.map(([m, v]) => (
              <span key={m} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${m === mesAtivo ? 'border-primary bg-primary/10 text-secondary' : 'border-bd bg-surface2'}`}>
                <button type="button" onClick={() => setMes(m)} title="Ver este mês" className="font-medium">{m}</button>
                <span className="tabular-nums text-muted">{brl(v)}</span>
                <button type="button" onClick={() => remover(m)} title="Remover" className="text-muted hover:text-danger">✕</button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {semanas.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">Selecione um mês válido.</p>
      ) : (
        <FluxoSemanal semanas={semanas} estrutura={conc.estrutura} fluxo={fluxo} saldoInicial={saldoMes} />
      )}
    </div>
  )
}
