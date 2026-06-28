/** @file Navegação lateral fixa do painel (padrão AG 240px) — acordeão por camada. */
import { useEffect, useState } from 'react'
import { somSelecao, somTick } from '@/lib/som'
import { Logo } from './Logo.tsx'

export type Aba =
  | 'cadastro'
  | 'plano'
  | 'valores'
  | 'fornecedores'
  | 'pagar'
  | 'receber'
  | 'modelo'
  | 'demonstracoes'
  | 'projecao'
  | 'relatorios'
  | 'apresentacao'
  | 'config'

interface Item {
  readonly id: Aba
  readonly rotulo: string
  readonly icone: string
  /** Rótulo de divisória renderizado antes deste item (agrupa visualmente dentro da seção). */
  readonly divisorAntes?: string
}

interface Secao {
  readonly titulo: string
  readonly icone: string
  readonly itens: readonly Item[]
}

const SECOES: readonly Secao[] = [
  {
    titulo: 'Captura',
    icone: '↓',
    itens: [
      { id: 'cadastro', rotulo: 'Cadastro', icone: '☰' },
      { id: 'plano', rotulo: 'Plano de Contas', icone: '≣', divisorAntes: 'Fonte Omie' },
      { id: 'valores', rotulo: 'Lançamentos', icone: '◷' },
      { id: 'fornecedores', rotulo: 'Contrapartes', icone: '◑' },
      { id: 'pagar', rotulo: 'Títulos a Pagar', icone: '⧖' },
      { id: 'receber', rotulo: 'Títulos a Receber', icone: '◵' },
    ],
  },
  {
    titulo: 'Camada Semântica',
    icone: '◈',
    itens: [
      { id: 'modelo', rotulo: 'Matriz de Classificações', icone: '◈' },
      { id: 'demonstracoes', rotulo: 'Demonstrações (DRE/DFC)', icone: '✎' },
      { id: 'projecao', rotulo: 'Projeção', icone: '◬' },
    ],
  },
  {
    titulo: 'Camada Analítica',
    icone: '▦',
    itens: [
      { id: 'relatorios', rotulo: 'Relatórios', icone: '▦' },
      { id: 'apresentacao', rotulo: 'Apresentação', icone: '◰' },
    ],
  },
  {
    titulo: 'Configuração',
    icone: '⚙',
    itens: [{ id: 'config', rotulo: 'Configurações', icone: '⚙' }],
  },
]

function grupoDaAba(aba: Aba): string {
  return SECOES.find((s) => s.itens.some((i) => i.id === aba))?.titulo ?? 'Captura'
}

export const ROTULO_ABA: Readonly<Record<Aba, string>> = Object.fromEntries(
  SECOES.flatMap((s) => s.itens.map((i) => [i.id, i.rotulo])),
) as Record<Aba, string>

interface Props {
  readonly ativa: Aba
  readonly onSelecionar: (aba: Aba) => void
  readonly aberta: boolean
}

export function Sidebar({ ativa, onSelecionar, aberta }: Props) {
  const [grupoAberto, setGrupoAberto] = useState(() => grupoDaAba(ativa))
  // Mantém aberta a camada da aba ativa quando ela muda por fora (ex.: deep link).
  useEffect(() => setGrupoAberto(grupoDaAba(ativa)), [ativa])

  return (
    <aside
      className={`h-dvh shrink-0 overflow-y-auto overflow-x-hidden border-bd bg-surface transition-[width] duration-300 ${
        aberta ? 'w-64 border-r' : 'w-0'
      }`}
    >
      {/* Largura interna fixa: o texto não quebra durante a animação de recolher. */}
      <div className="flex h-full w-64 flex-col">
        <div className="border-b border-bd px-6 py-5">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1.5 overflow-y-auto p-3">
          {SECOES.map((secao) => (
            <Camada
              key={secao.titulo}
              secao={secao}
              aberta={secao.titulo === grupoAberto}
              ativa={ativa}
              onAbrir={() => setGrupoAberto((g) => (g === secao.titulo ? '' : secao.titulo))}
              onSelecionar={onSelecionar}
            />
          ))}
        </nav>
        <p className="mt-auto px-6 py-4 text-xs text-muted">
          BPO financeiro · dados Omie
          <span className="mt-1 block text-[10px] text-muted/60">build {__BUILD_TIME__}</span>
        </p>
      </div>
    </aside>
  )
}

function Camada({
  secao,
  aberta,
  ativa,
  onAbrir,
  onSelecionar,
}: {
  secao: Secao
  aberta: boolean
  ativa: Aba
  onAbrir: () => void
  onSelecionar: (aba: Aba) => void
}) {
  const temAtiva = secao.itens.some((i) => i.id === ativa)
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onMouseEnter={somTick}
        onClick={() => { somSelecao(); onAbrir() }}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
          temAtiva ? 'text-secondary' : 'text-muted/70 hover:text-text'
        }`}
      >
        <span className="w-5 text-center text-base">{secao.icone}</span>
        <span className="flex-1 text-left">{secao.titulo}</span>
        <span className={`text-[10px] transition-transform duration-200 ${aberta ? 'rotate-90' : ''}`}>▸</span>
      </button>
      {aberta ? (
        <div className="ml-2 flex flex-col gap-0.5 border-l border-bd/60 pb-1 pl-2">
          {secao.itens.map((item) => (
            <ItemNav key={item.id} item={item} ativo={item.id === ativa} onSelecionar={onSelecionar} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ItemNav({ item, ativo, onSelecionar }: { item: Item; ativo: boolean; onSelecionar: (aba: Aba) => void }) {
  return (
    <>
      {item.divisorAntes ? (
        <p className="px-3 pb-0.5 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted/50">
          {item.divisorAntes}
        </p>
      ) : null}
      <button
        type="button"
        onMouseEnter={somTick}
        onClick={() => { somSelecao(); onSelecionar(item.id) }}
        className={classe(ativo)}
      >
        <span className="w-5 text-center text-base">{item.icone}</span>
        {item.rotulo}
      </button>
    </>
  )
}

function classe(ativo: boolean): string {
  const base =
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200'
  return ativo
    ? `${base} bg-primary text-white`
    : `${base} text-muted hover:bg-surface2 hover:text-text hover:translate-x-0.5`
}
