/** @file Navegação lateral fixa do painel (padrão AG 240px) — acordeão por camada. */
import { useEffect, useState } from 'react'
import { comProvedor } from '@/core/provedor'
import { useProvedor } from '@/lib/clientes'
import { somSelecao, somTick } from '@/lib/som'
import { IconeNav } from './IconesNav.tsx'
import { BotaoNovidades } from './Novidades.tsx'
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
  | 'hud'
  | 'acessos'
  | 'config'

interface Item {
  readonly id: Aba
  readonly rotulo: string
  /** Rótulo de divisória renderizado antes deste item (agrupa visualmente dentro da seção). */
  readonly divisorAntes?: string
}

interface Secao {
  readonly titulo: string
  readonly itens: readonly Item[]
}

const SECOES: readonly Secao[] = [
  {
    titulo: 'Captura',
    itens: [
      { id: 'cadastro', rotulo: 'Cadastro' },
      { id: 'plano', rotulo: 'Plano de Contas', divisorAntes: 'Fonte {provedor}' },
      { id: 'valores', rotulo: 'Lançamentos' },
      { id: 'fornecedores', rotulo: 'Contrapartes' },
      { id: 'pagar', rotulo: 'Títulos a Pagar' },
      { id: 'receber', rotulo: 'Títulos a Receber' },
    ],
  },
  {
    titulo: 'Camada Semântica',
    itens: [
      { id: 'modelo', rotulo: 'Matriz de Classificações' },
      { id: 'demonstracoes', rotulo: 'Demonstrações (DRE/DFC)' },
      { id: 'projecao', rotulo: 'Projeção' },
    ],
  },
  {
    titulo: 'Camada Analítica',
    itens: [
      { id: 'relatorios', rotulo: 'Relatórios' },
      { id: 'apresentacao', rotulo: 'Apresentação' },
      { id: 'hud', rotulo: 'HUD do Cliente', divisorAntes: 'Visão do cliente' },
    ],
  },
  {
    titulo: 'Configuração',
    itens: [
      { id: 'acessos', rotulo: 'Acessos' },
      { id: 'config', rotulo: 'Configurações' },
    ],
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
  const { nome: provedor } = useProvedor()
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
        <div className="mt-auto px-3 pb-1 pt-3">
          <BotaoNovidades />
        </div>
        <p className="px-6 pb-4 text-xs text-muted">
          BPO financeiro · dados {provedor}
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
        <span className="flex-1 text-left">{secao.titulo}</span>
        <span className={`text-[10px] transition-transform duration-200 ${aberta ? 'rotate-90' : ''}`}>▸</span>
      </button>
      {aberta ? (
        <div className="ml-2 flex flex-col gap-0.5 border-l border-bd/60 pb-1 pl-2">
          {secao.itens.map((item, i) => (
            <ItemNav key={item.id} item={item} ativo={item.id === ativa} indice={i} onSelecionar={onSelecionar} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ItemNav({
  item,
  ativo,
  indice,
  onSelecionar,
}: {
  item: Item
  ativo: boolean
  /** Posição dentro da seção — vira o prefixo mono 01..0n (§6). */
  indice: number
  onSelecionar: (aba: Aba) => void
}) {
  const rotulos = useProvedor()
  return (
    <>
      {item.divisorAntes ? (
        <p className="px-3 pb-0.5 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted/50">
          {comProvedor(item.divisorAntes, rotulos)}
        </p>
      ) : null}
      <button
        type="button"
        onMouseEnter={somTick}
        onClick={() => { somSelecao(); onSelecionar(item.id) }}
        aria-current={ativo ? 'page' : undefined}
        className={`nav-item ${ativo ? 'nav-item--ativo' : ''}`}
      >
        <span className="nav-item__num">{String(indice + 1).padStart(2, '0')}</span>
        <IconeNav aba={item.id} />
        <span className="truncate">{item.rotulo}</span>
      </button>
    </>
  )
}
