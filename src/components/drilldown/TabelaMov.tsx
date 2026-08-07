/** @file Tabela de movimentos individuais (detalhamento final): título editável, filial por movimento, status. */
import { useMemo } from 'react'
import { classeDe } from '@/core/classes'
import type { No } from '@/core/modelo'
import { chaveContraparte, chaveMovimento, type Movimento } from '@/core/movimento'
import { descreverOrigem } from '@/core/origens'
import { useCadastros } from '@/lib/cadastros'
import { useProvedor } from '@/lib/clientes'
import { useFilialSelecao, type FilialSelecaoApi } from '@/lib/filialSelecao'
import { brl } from '@/lib/money'
import { useModelo } from '@/lib/useModelo'
import { useOverrides } from '@/lib/overrides'
import { useSomenteLeitura } from '@/lib/somenteLeitura'
import { NomeEditavel } from '../NomeEditavel.tsx'
import { SeletorBusca } from '../SeletorBusca.tsx'

export function TabelaMov({ movimentos }: { movimentos: readonly Movimento[] }) {
  const { resolvedor } = useOverrides()
  const filial = useFilialSelecao()
  const somenteLeitura = useSomenteLeitura()
  const { modelo } = useModelo()
  const { categorias } = useCadastros()
  const conc = modelo.contas
  const noPorId = useMemo(() => new Map<string, No>(conc.estrutura.map((n) => [n.id, n])), [conc.estrutura])
  const catPorCodigo = useMemo(() => new Map(categorias.categorias.map((c) => [c.codigo, c])), [categorias])
  // (classe · subgrupo) da movimentação: classe = agrupadora do ERP; subgrupo = nó da conciliação.
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
              <TituloCelula m={m} somenteLeitura={somenteLeitura} />
              {refDe(m) ? <div className="text-[10px] text-muted/70">({refDe(m)})</div> : null}
            </td>
            <td className="px-6 py-2 text-xs">{resolvedor.contraparte(chaveContraparte(m)).nome}</td>
            {filial ? (
              <td className="px-6 py-2">
                <CelulaFilial m={m} api={filial} somenteLeitura={somenteLeitura} />
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
 * Cascata visível: rateio do ERP = badge fixo (fonte de verdade do ERP); herdada da
 * contraparte = pré-selecionada com tag "auto", editável; editar grava override do movimento.
 */
function CelulaFilial({ m, api, somenteLeitura }: { m: Movimento; api: FilialSelecaoApi; somenteLeitura: boolean }) {
  const provedor = useProvedor()
  const r = api.resolver(m)
  if (r?.origem === 'omie') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent" title={`Rateado ${provedor.em} — puxado automaticamente no sync`}>
        {api.nomeDe(r.noId)} <span className="text-[10px] opacity-75">· {provedor.nome}</span>
      </span>
    )
  }
  // Cliente (read-only): sem o seletor que grava override — só o rótulo já atribuído.
  if (somenteLeitura) {
    return <span className="text-xs text-muted">{r?.noId ? api.nomeDe(r.noId) : '—'}</span>
  }
  return (
    <span className="inline-flex max-w-52 items-center gap-1.5">
      <SeletorBusca
        opcoes={api.opcoes.map((o) => ({ valor: o.id, rotulo: o.rotulo }))}
        valor={r?.noId ?? ''}
        onEscolher={(noId) => api.atribuir(m, noId)}
        rotuloVazio="— selecionar —"
        placeholderBusca="Buscar filial/centro…"
        titulo={r?.origem === 'auto' ? 'Herdada automaticamente da contraparte — edite se for de outra filial' : undefined}
        classeGatilho={`flex w-full items-center justify-between gap-1.5 rounded border px-2 py-1 text-left text-xs outline-none transition-colors hover:border-primary ${
          r?.origem === 'auto' ? 'border-secondary/40 bg-secondary/10 text-secondary' : 'border-bd bg-surface2'
        }`}
      />
      {r?.origem === 'auto' ? <span className="text-[10px] text-secondary/80">auto</span> : null}
    </span>
  )
}

function TituloCelula({ m, somenteLeitura }: { m: Movimento; somenteLeitura: boolean }) {
  const { resolvedor } = useOverrides()
  // chaveMovimento, não `idTitulo || documento`: '0' é string TRUTHY — todo evento de extrato
  // caía na chave '0' e renomear UM renomeava TODOS (era o "registro sem código" do report
  // 07/08). A canônica dá cc:<idMovCC> a cada evento; prod confirmou 0 overrides gravados
  // no formato antigo, então a troca não órfã nada.
  const chave = chaveMovimento(m)
  // Fallback do nº do documento (report 03/08): extrato/título sem cNumTitulo mostra o
  // texto livre do ERP (que carrega o código) em vez de "Sem documento".
  const resolvido = resolvedor.titulo(chave, m.documento || m.descricao || '')
  const dica = descreverOrigem(m.origem, m.idTitulo)
  // Cliente (read-only): nome resolvido puro, sem o ✎ que grava override.
  if (somenteLeitura) return <span title={dica}>{resolvido.nome || '—'}</span>
  // Editável mesmo sem rótulo: apelidar um evento de extrato sem documento é caso real.
  return (
    <span title={dica}>
      <NomeEditavel entidade="titulo" codigo={chave} resolvido={resolvido} />
    </span>
  )
}

function corStatus(status: string): string {
  const s = status.toUpperCase()
  if (s.includes('CANCEL')) return 'bg-danger/15 text-danger'
  if (s.includes('LIQUID') || s.includes('PAGO') || s.includes('RECEB')) return 'bg-accent/15 text-accent'
  return 'bg-warn/15 text-warn'
}
