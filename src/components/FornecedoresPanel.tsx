/** @file Contrapartes agregadas (clientes/fornecedores) com drill-down em modal. */
import { useMemo, useState } from 'react'
import { gruposDuplicados, type GrupoDuplicado, type MembroDuplicata } from '@/core/duplicatas'
import { chaveContraparte, type Movimento } from '@/core/movimento'
import type { ClientesSeed } from '@/core/cliente'
import { useCadastros } from '@/lib/cadastros'
import { useDuplicatasIgnoradas } from '@/lib/duplicatasDoc'
import { useMovimentos } from '@/lib/movimentos'
import { brl } from '@/lib/money'
import { useOverrides } from '@/lib/overrides'
import { irParaAba } from './InicioPanel.tsx'
import { KpiCard } from './KpiCard.tsx'
import { MovimentosModal } from './MovimentosModal.tsx'
import { NomeEditavel } from './NomeEditavel.tsx'
import { SecaoDuplicatas } from './SecaoDuplicatas.tsx'
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
  const { resolvedor, renomear } = useOverrides()
  const { movimentos: todos } = useMovimentos()
  const { clientes } = useCadastros()
  const { ignoradas, ignorar } = useDuplicatasIgnoradas()
  const [tipo, setTipo] = useState<Tipo>('despesa')
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<LinhaParte | null>(null)

  const movs = useMemo(() => filtrarTipo(todos, tipo), [todos, tipo])
  // Nome pelo resolvedor: busca e título do modal enxergam o mesmo rename que a célula exibe.
  const linhas = useMemo(
    () => agrupar(movs, clientes.clientes, (c) => resolvedor.contraparte(c).nome),
    [movs, clientes, resolvedor],
  )
  const totalCentavos = useMemo(() => linhas.reduce((a, l) => a + l.totalCentavos, 0), [linhas])
  const visiveis = useMemo(() => filtrarBusca(linhas, busca), [linhas, busca])

  // Prevenção de cadastro duplicado: códigos distintos com o MESMO nome normalizado.
  // O estado (excluído/inativo) mantém a conta morta distinta da viva no grupo.
  const duplicatas = useMemo(() => {
    const membros: MembroDuplicata[] = linhas.map((l) => ({
      codigo: l.codigo,
      nome: l.nome,
      estado: resolvedor.contraparte(l.codigo).estado,
      totalCentavos: l.totalCentavos,
      qtd: l.quantidade,
    }))
    return gruposDuplicados(membros, ignoradas)
  }, [linhas, resolvedor, ignoradas])

  function unificar(g: GrupoDuplicado) {
    const canonico = g.membros[0]!.nome
    const renomeaveis = g.membros.filter((m) => m.nome !== canonico)
    const ok = window.confirm(
      `Unificar ${g.membros.length} cadastros como "${canonico}"? Os nomes são ajustados no painel (o original do ERP fica intacto e reversível) e os agrupamentos passam a somar junto.`,
    )
    if (!ok) return
    for (const m of renomeaveis) renomear('contraparte', m.codigo, canonico)
    ignorar(g.chave)
  }

  function recolocar(g: GrupoDuplicado) {
    window.dispatchEvent(new CustomEvent('lf-buscar-conciliacao', { detail: { dim: 'fornecedores', termo: g.membros[0]!.nome } }))
    irParaAba('modelo')
  }

  function naoEhDuplicata(g: GrupoDuplicado) {
    if (window.confirm('Marcar este grupo como legítimo? Ele some da lista de possíveis duplicatas deste cliente.')) ignorar(g.chave)
  }

  const movsAberta = useMemo(
    () => (aberta ? movs.filter((m) => chaveContraparte(m) === aberta.codigo) : []),
    [aberta, movs],
  )

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[19px] font-semibold">Fornecedores e Clientes</h1>
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

      <SecaoDuplicatas grupos={duplicatas} onUnificar={unificar} onIgnorar={naoEhDuplicata} onRecolocar={recolocar} />

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

function agrupar(
  movimentos: readonly Movimento[],
  clientes: ClientesSeed['clientes'],
  nomeDe: (codigo: string) => string,
): LinhaParte[] {
  const acc = new Map<string, { quantidade: number; totalCentavos: number }>()
  for (const m of movimentos) {
    const chave = chaveContraparte(m)
    const atual = acc.get(chave) ?? { quantidade: 0, totalCentavos: 0 }
    atual.quantidade += 1
    atual.totalCentavos += m.valorCentavos
    acc.set(chave, atual)
  }
  return [...acc.entries()]
    .map(([codigo, v]) => ({
      codigo,
      nome: nomeDe(codigo),
      doc: clientes[codigo]?.doc ?? '',
      quantidade: v.quantidade,
      totalCentavos: v.totalCentavos,
    }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos)
}

function filtrarBusca(linhas: readonly LinhaParte[], busca: string): LinhaParte[] {
  const termo = busca.trim().toLowerCase()
  if (!termo) return [...linhas]
  return linhas.filter(
    (l) => l.nome.toLowerCase().includes(termo) || l.doc.toLowerCase().includes(termo),
  )
}
