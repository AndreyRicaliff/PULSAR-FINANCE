/** @file Tabela de movimentos individuais (detalhamento final): título editável, filial por movimento, status. */
import { useMemo } from 'react'
import { classeDe } from '@/core/classes'
import type { No } from '@/core/modelo'
import type { Movimento } from '@/core/movimento'
import { useCadastros } from '@/lib/cadastros'
import { useFilialSelecao, type FilialSelecaoApi } from '@/lib/filialSelecao'
import { brl } from '@/lib/money'
import { useModelo } from '@/lib/useModelo'
import { useOverrides } from '@/lib/overrides'
import { NomeEditavel } from '../NomeEditavel.tsx'

export function TabelaMov({ movimentos }: { movimentos: readonly Movimento[] }) {
  const { resolvedor } = useOverrides()
  const filial = useFilialSelecao()
  const { modelo } = useModelo()
  const { categorias } = useCadastros()
  const conc = modelo.contas
  const noPorId = useMemo(() => new Map<string, No>(conc.estrutura.map((n) => [n.id, n])), [conc.estrutura])
  const catPorCodigo = useMemo(() => new Map(categorias.categorias.map((c) => [c.codigo, c])), [categorias])
  // (classe · subgrupo) da movimentação: classe = agrupadora Omie; subgrupo = nó da conciliação.
  const refDe = (m: Movimento): string => {
    const no = noPorId.get(conc.mapa[m.categoria] ?? '')
    const subgrupo = no?.paiId ? no.nome : ''
    const classe = classeDe(m.categoria, catPorCodigo)?.descricao ?? ''
    return [classe, subgrupo].filter(Boolean).join(' · ')
  }
  const ordenados = [...movimentos].sort((a, b) => Math.abs(b.valorCentavos) - Math.abs(a.valorCentavos))
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-surface2">
        <tr className="border-y border-bd text-left text-xs uppercase tracking-wide text-muted">
          <th className="px-6 py-2 font-medium">Data</th>
          <th className="px-6 py-2 font-medium">Documento / Título (AG)</th>
          <th className="px-6 py-2 font-medium">Contraparte</th>
          {filial ? <th className="px-6 py-2 font-medium">Filial / C. Custo</th> : null}
          <th className="px-6 py-2 font-medium">Origem</th>
          <th className="px-6 py-2 font-medium">Status</th>
          <th className="px-6 py-2 text-right font-medium">Valor</th>
        </tr>
      </thead>
      <tbody>
        {ordenados.map((m, i) => (
          <tr key={`${m.documento}-${i}`} className="border-b border-bd/40 last:border-0">
            <td className="px-6 py-2 tabular-nums text-muted">{m.data || '—'}</td>
            <td className="px-6 py-2 text-xs">
              <TituloCelula m={m} />
              {refDe(m) ? <div className="text-[10px] text-muted/70">({refDe(m)})</div> : null}
            </td>
            <td className="px-6 py-2 text-xs">{resolvedor.contraparte(m.contraparteCodigo).nome}</td>
            {filial ? (
              <td className="px-6 py-2">
                <CelulaFilial m={m} api={filial} />
              </td>
            ) : null}
            <td className="px-6 py-2 font-mono text-[11px] text-muted">{m.origem || '—'}</td>
            <td className="px-6 py-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${corStatus(m.status)}`}>
                {m.status || '—'}
              </span>
            </td>
            <td className="px-6 py-2 text-right font-semibold tabular-nums">{brl(m.valorCentavos)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Cascata visível: rateio Omie = badge fixo (fonte de verdade do ERP); herdada da
 * contraparte = pré-selecionada com tag "auto", editável; editar grava override do movimento.
 */
function CelulaFilial({ m, api }: { m: Movimento; api: FilialSelecaoApi }) {
  const r = api.resolver(m)
  if (r?.origem === 'omie') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent" title="Rateado na Omie — puxado automaticamente no sync">
        {api.nomeDe(r.noId)} <span className="text-[10px] opacity-75">· Omie</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        value={r?.noId ?? ''}
        onChange={(e) => api.atribuir(m, e.target.value)}
        title={r?.origem === 'auto' ? 'Herdada automaticamente da contraparte — edite se for de outra filial' : undefined}
        className={`max-w-44 rounded border px-2 py-1 text-xs outline-none focus:border-primary ${
          r?.origem === 'auto' ? 'border-secondary/40 bg-secondary/10 text-secondary' : 'border-bd bg-surface2'
        }`}
      >
        <option value="">— selecionar —</option>
        {api.opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {r?.origem === 'auto' ? <span className="text-[10px] text-secondary/80">auto</span> : null}
    </span>
  )
}

function TituloCelula({ m }: { m: Movimento }) {
  const { resolvedor } = useOverrides()
  const chave = m.idTitulo || m.documento
  if (!chave) return <span className="text-muted">—</span>
  return (
    <NomeEditavel entidade="titulo" codigo={chave} resolvido={resolvedor.titulo(chave, m.documento)} />
  )
}

function corStatus(status: string): string {
  const s = status.toUpperCase()
  if (s.includes('CANCEL')) return 'bg-danger/15 text-danger'
  if (s.includes('LIQUID') || s.includes('PAGO') || s.includes('RECEB')) return 'bg-accent/15 text-accent'
  return 'bg-warn/15 text-warn'
}
