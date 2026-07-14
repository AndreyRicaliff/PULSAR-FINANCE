/**
 * @file Contas a Pagar / Contas a Receber — módulos dedicados, com CONCILIAÇÃO embutida:
 * cada título mostra o grupo da matriz (dimensão contas) e o não conciliado ganha um
 * select inline que mapeia a CATEGORIA inteira (mesma operação da Matriz de Classificações
 * — vale para todos os títulos e movimentos daquela categoria).
 */
import { useMemo, useState } from 'react'
import { rotuloCategoria } from '@/core/categoria'
import { codigoContraparte } from '@/core/cliente'
import { opcoesDaEstrutura } from '@/core/modelo'
import type { Resolvedor } from '@/core/override'
import { isoDeMov } from '@/core/periodo'
import { grupoDoTitulo } from '@/core/projecao'
import {
  agendaVencimentos,
  estaAberto,
  somaCentavos,
  type NaturezaTitulo,
  type Titulo,
} from '@/core/titulo'
import { dataHora } from '@/lib/datas'
import { brl } from '@/lib/money'
import { useOverrides } from '@/lib/overrides'
import { useModelo } from '@/lib/useModelo'
import { useTitulos } from '@/lib/useTitulos'
import { KpiCard } from './KpiCard.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'

type Vista = 'abertos' | 'todos'
const VISTAS: readonly OpcaoSeg<Vista>[] = [
  { id: 'abertos', rotulo: 'Em aberto' },
  { id: 'todos', rotulo: 'Todos' },
]

const TITULO_MODULO: Readonly<Record<NaturezaTitulo, string>> = {
  P: 'Contas a Pagar',
  R: 'Contas a Receber',
}

export function ContasPagarPanel() {
  return <ContasPanel natureza="P" />
}

export function ContasReceberPanel() {
  return <ContasPanel natureza="R" />
}

function ContasPanel({ natureza }: { natureza: NaturezaTitulo }) {
  const { titulos, geradoEm, origem } = useTitulos()
  const { modelo, mapear } = useModelo()
  const [vista, setVista] = useState<Vista>('abertos')
  const conc = modelo.contas

  const doLado = useMemo(() => titulos.filter((t) => t.natureza === natureza), [titulos, natureza])
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const agenda = useMemo(() => agendaVencimentos(doLado, hoje), [doLado, hoje])
  const abertos = useMemo(() => doLado.filter(estaAberto), [doLado])
  const visiveis = useMemo(
    () => ordenar(vista === 'abertos' ? abertos : doLado),
    [vista, abertos, doLado],
  )
  const semGrupo = useMemo(() => abertos.filter((t) => !grupoDoTitulo(t, conc)), [abertos, conc])
  const vencidos = agenda.faixas.get('vencidos') ?? []
  const proximos = [...(agenda.faixas.get('hoje') ?? []), ...(agenda.faixas.get('ate7') ?? [])]

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">{TITULO_MODULO[natureza]}</h1>
        <p className="text-sm text-muted">
          Títulos da Omie com status do ciclo de vida · conciliação pela mesma matriz dos
          movimentos — classificar aqui vale para a categoria inteira
          {geradoEm ? ` · sincronizado em ${dataHora(geradoEm)}` : ''}
          {origem === 'local' ? ' · foto do build (sincronize para atualizar)' : ''}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard rotulo="Vencidos" valor={brl(somaCentavos(vencidos))} cor="danger" nota={`${vencidos.length} títulos atrasados`} />
        <KpiCard rotulo="Hoje + 7 dias" valor={brl(somaCentavos(proximos))} cor="warn" nota={`${proximos.length} títulos`} />
        <KpiCard rotulo="Total em aberto" valor={brl(agenda.totalAbertoCentavos)} cor={natureza === 'R' ? 'accent' : 'secondary'} nota={`${agenda.qtdAbertos} títulos`} />
        <KpiCard
          rotulo="A conciliar"
          valor={String(semGrupo.length)}
          cor={semGrupo.length ? 'warn' : 'accent'}
          nota={semGrupo.length ? `${brl(somaCentavos(semGrupo))} sem grupo na matriz` : 'Tudo conciliado'}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Segmento opcoes={VISTAS} valor={vista} onTrocar={setVista} />
        <span className="text-xs text-muted">{visiveis.length} títulos</span>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
          Nenhum título {vista === 'abertos' ? 'em aberto' : ''} de {TITULO_MODULO[natureza].toLowerCase()}.
        </p>
      ) : (
        <Tabela
          titulos={visiveis}
          conc={conc}
          onConciliar={(categoria, grupoId) => mapear('contas', categoria, grupoId)}
        />
      )}
    </div>
  )
}

function ordenar(ts: readonly Titulo[]): Titulo[] {
  return [...ts].sort((a, b) => (isoDeMov(a.dataVencimento) ?? '9999').localeCompare(isoDeMov(b.dataVencimento) ?? '9999'))
}

interface PropsTabela {
  readonly titulos: readonly Titulo[]
  readonly conc: ReturnType<typeof useModelo>['modelo']['contas']
  readonly onConciliar: (categoria: string, grupoId: string) => void
}

function Tabela({ titulos, conc, onConciliar }: PropsTabela) {
  // Resolvedor = caminho único de nomes (cadastro + overrides de rename do usuário).
  const { resolvedor } = useOverrides()
  const nomesGrupo = useMemo(() => new Map(conc.estrutura.map((n) => [n.id, n.nome])), [conc.estrutura])
  const opcoes = useMemo(() => opcoesDaEstrutura(conc.estrutura), [conc.estrutura])
  const hoje = new Date().toISOString().slice(0, 10)
  return (
    <div className="max-h-[36rem] overflow-auto rounded-card border border-bd">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-surface2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Vencimento</th>
            <th className="px-4 py-2 font-medium">Documento</th>
            <th className="px-4 py-2 font-medium">Contraparte</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Grupo (conciliação)</th>
            <th className="px-4 py-2 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {titulos.map((t) => {
            const grupoId = grupoDoTitulo(t, conc)
            const vencIso = isoDeMov(t.dataVencimento)
            const atrasado = estaAberto(t) && vencIso !== null && vencIso < hoje
            const rotuloCat = rotuloCategoria(t.categoria, resolvedor.categoria(t.categoria).nome)
            return (
              <tr key={`${t.id}|${t.parcela}`} className="border-t border-bd/50">
                <td className={`px-4 py-2 tabular-nums ${atrasado ? 'font-semibold text-danger' : ''}`}>{t.dataVencimento || '—'}</td>
                <td className="px-4 py-2">{t.documento || '—'}{t.parcela && t.parcela !== '001/001' ? <span className="text-xs text-muted"> · {t.parcela}</span> : null}</td>
                <td className="px-4 py-2">{nomeFornecedor(t.fornecedorCodigo, resolvedor)}</td>
                <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-2">
                  {grupoId ? (
                    <span className="text-muted">{nomesGrupo.get(grupoId) ?? grupoId}</span>
                  ) : (
                    <select
                      defaultValue=""
                      onChange={(e) => e.target.value && onConciliar(t.categoria, e.target.value)}
                      className="rounded-lg border border-warn/50 bg-surface2 px-2 py-1 text-xs text-warn outline-none focus:border-primary"
                      title={`Concilia a categoria ${rotuloCat} inteira (todos os títulos e movimentos dela)`}
                    >
                      <option value="">A conciliar ({rotuloCat})</option>
                      {opcoes.map((o) => (
                        <option key={o.id} value={o.id}>{o.rotulo}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className={`px-4 py-2 text-right font-semibold tabular-nums ${t.natureza === 'R' ? 'text-accent' : ''}`}>{brl(t.valorCentavos)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Rota pelo resolvedor (mesma dos demais painéis) — cadastro, heurísticas Nibo e overrides.
function nomeFornecedor(codigo: string, resolvedor: Resolvedor): string {
  const cod = codigoContraparte(codigo)
  return cod ? resolvedor.contraparte(cod).nome : '—'
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase()
  const classe =
    s === 'ATRASADO' ? 'bg-danger/15 text-danger' : s === 'A VENCER' ? 'bg-warn/15 text-warn' : s === 'PAGO' || s === 'RECEBIDO' ? 'bg-accent/15 text-accent' : 'bg-surface2 text-muted'
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${classe}`}>{status || '—'}</span>
}
