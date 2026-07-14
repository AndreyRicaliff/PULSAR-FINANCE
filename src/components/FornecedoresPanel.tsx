/** @file Contrapartes agregadas (clientes/fornecedores) com drill-down em modal. */
import { useMemo, useState } from 'react'
import { chaveContraparte, type Movimento } from '@/core/movimento'
import { nomeContraparte, type ClientesSeed } from '@/core/cliente'
import { useCadastros } from '@/lib/cadastros'
import { useMovimentos } from '@/lib/movimentos'
import { brl } from '@/lib/money'
import { useOverrides } from '@/lib/overrides'
import { KpiCard } from './KpiCard.tsx'
import { MovimentosModal } from './MovimentosModal.tsx'
import { NomeEditavel } from './NomeEditavel.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'

// P = pagar (fornecedor/despesa) · R = receber (cliente/receita).
type Tipo = 'despesa' | 'receita'

const TIPOS: readonly OpcaoSeg<Tipo>[] = [
  { id: 'despesa', rotulo: 'Despesas (fornecedores)' },
  { id: 'receita', rotulo: 'Receitas (clientes)' },
]

interface LinhaParte {
  readonly codigo: string
  readonly nome: string
  readonly doc: string
  readonly quantidade: number
  readonly totalCentavos: number
}

export function FornecedoresPanel() {
  const { resolvedor } = useOverrides()
  const { movimentos: todos } = useMovimentos()
  const { clientes } = useCadastros()
  const [tipo, setTipo] = useState<Tipo>('despesa')
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<LinhaParte | null>(null)

  const movs = useMemo(() => filtrarTipo(todos, tipo), [todos, tipo])
  const linhas = useMemo(() => agrupar(movs, clientes.clientes), [movs, clientes])
  const totalCentavos = useMemo(() => linhas.reduce((a, l) => a + l.totalCentavos, 0), [linhas])
  const visiveis = useMemo(() => filtrarBusca(linhas, busca), [linhas, busca])

  const movsAberta = useMemo(
    () => (aberta ? movs.filter((m) => chaveContraparte(m) === aberta.codigo) : []),
    [aberta, movs],
  )

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Fornecedores e Clientes</h1>
        <p className="text-sm text-muted">
          {tipo === 'despesa' ? 'Quem a empresa paga' : 'Quem paga a empresa'} · clique para ver os
          movimentos
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          rotulo={tipo === 'despesa' ? 'Total a fornecedores' : 'Total de clientes'}
          valor={brl(totalCentavos)}
          cor={tipo === 'despesa' ? 'danger' : 'accent'}
        />
        <KpiCard rotulo={tipo === 'despesa' ? 'Fornecedores' : 'Clientes'} valor={linhas.length} cor="secondary" />
        <KpiCard rotulo="Movimentos" valor={movs.length} cor="primary" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmento opcoes={TIPOS} valor={tipo} onTrocar={setTipo} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar fornecedor/cliente…"
          className="w-64 rounded-lg border border-bd bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-primary"
        />
      </div>

      <div className="overflow-hidden rounded-card border border-bd bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bd text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">{tipo === 'despesa' ? 'Fornecedor' : 'Cliente'}</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 text-right font-medium">Movim.</th>
              <th className="px-4 py-3 text-right font-medium">Valor total</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l) => (
              <tr
                key={l.codigo}
                onClick={() => setAberta(l)}
                className="cursor-pointer border-b border-bd/60 last:border-0 hover:bg-surface2"
              >
                <td className="px-4 py-2.5">
                  <NomeEditavel entidade="contraparte" codigo={l.codigo} resolvido={resolvedor.contraparte(l.codigo)} />
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted">{l.doc || '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted">{l.quantidade}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{brl(l.totalCentavos)}</td>
              </tr>
            ))}
            {visiveis.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Nenhum resultado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {aberta ? (
        <MovimentosModal
          titulo={aberta.nome}
          codigo={aberta.doc || aberta.codigo}
          subtitulo={`${aberta.quantidade} movimentos · ${brl(aberta.totalCentavos)}`}
          movimentos={movsAberta}
          eixosIniciais={['categoria']}
          onFechar={() => setAberta(null)}
        />
      ) : null}
    </div>
  )
}

function filtrarTipo(movimentos: readonly Movimento[], tipo: Tipo): Movimento[] {
  const nat = tipo === 'despesa' ? 'P' : 'R'
  return movimentos.filter((m) => m.natureza.toUpperCase() === nat)
}

function agrupar(movimentos: readonly Movimento[], clientes: ClientesSeed['clientes']): LinhaParte[] {
  const acc = new Map<string, { quantidade: number; totalCentavos: number }>()
  for (const m of movimentos) {
    const chave = chaveContraparte(m)
    const atual = acc.get(chave) ?? { quantidade: 0, totalCentavos: 0 }
    atual.quantidade += 1
    atual.totalCentavos += m.valorCentavos
    acc.set(chave, atual)
  }
  return [...acc.entries()]
    .map(([codigo, v]) => montar(codigo, v, clientes))
    .sort((a, b) => b.totalCentavos - a.totalCentavos)
}

function montar(codigo: string, v: { quantidade: number; totalCentavos: number }, clientes: ClientesSeed['clientes']): LinhaParte {
  const info = clientes[codigo]
  return {
    codigo,
    nome: nomeContraparte(codigo, clientes),
    doc: info?.doc ?? '',
    quantidade: v.quantidade,
    totalCentavos: v.totalCentavos,
  }
}

function filtrarBusca(linhas: readonly LinhaParte[], busca: string): LinhaParte[] {
  const termo = busca.trim().toLowerCase()
  if (!termo) return [...linhas]
  return linhas.filter(
    (l) => l.nome.toLowerCase().includes(termo) || l.doc.toLowerCase().includes(termo),
  )
}
