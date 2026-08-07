/** @file Navegação lateral fixa do painel (padrão AG 240px) — todas as funções visíveis. */
import { comProvedor } from '@/core/provedor'
import { useProvedor } from '@/lib/clientes'
import { usePendencias, type Pendencias } from '@/lib/usePendencias'
import { somSelecao, somTick } from '@/lib/som'
import { IconeNav } from './IconesNav.tsx'
import { BotaoNovidades } from './Novidades.tsx'
import { Logo } from './Logo.tsx'

export type Aba =
  | 'inicio'
  | 'cadastro'
  | 'plano'
  | 'valores'
  | 'fornecedores'
  | 'pagar'
  | 'receber'
  | 'manuais'
  | 'aprovacoes'
  | 'modelo'
  | 'demonstracoes'
  | 'projecao'
  | 'capexcomp'
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

// Títulos em linguagem de FUNÇÃO, não de arquitetura (revisão 07/08): "Camada Semântica"
// e "Camada Analítica" descreviam o desenho interno do sistema, não o que se faz nelas.
const SECOES: readonly Secao[] = [
  {
    titulo: 'Visão geral',
    itens: [{ id: 'inicio', rotulo: 'Início' }],
  },
  {
    titulo: 'Captura',
    itens: [
      { id: 'cadastro', rotulo: 'Cadastro' },
      { id: 'plano', rotulo: 'Plano de Contas', divisorAntes: 'Fonte {provedor}' },
      { id: 'valores', rotulo: 'Lançamentos' },
      { id: 'fornecedores', rotulo: 'Contrapartes' },
      { id: 'pagar', rotulo: 'Títulos a Pagar' },
      { id: 'receber', rotulo: 'Títulos a Receber' },
      { id: 'manuais', rotulo: 'Lançamentos Manuais', divisorAntes: 'Fora do banco' },
    ],
  },
  {
    titulo: 'Classificação',
    itens: [
      { id: 'modelo', rotulo: 'Matriz de Classificações' },
      { id: 'demonstracoes', rotulo: 'Demonstrações (DRE/DFC)' },
      { id: 'projecao', rotulo: 'Projeção' },
      { id: 'capexcomp', rotulo: 'Comparativo de CAPEX' },
    ],
  },
  {
    titulo: 'Operação',
    itens: [{ id: 'aprovacoes', rotulo: 'Aprovações de Pagamento' }],
  },
  {
    titulo: 'Relatórios & Cliente',
    itens: [
      { id: 'relatorios', rotulo: 'Relatórios' },
      { id: 'apresentacao', rotulo: 'Apresentações' },
      { id: 'hud', rotulo: 'Visão do Cliente', divisorAntes: 'Visão do cliente' },
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

export const ROTULO_ABA: Readonly<Record<Aba, string>> = Object.fromEntries(
  SECOES.flatMap((s) => s.itens.map((i) => [i.id, i.rotulo])),
) as Record<Aba, string>

/** Qual pendência alimenta o badge de cada item — só itens que têm FILA real. */
const BADGE_DE: Readonly<Partial<Record<Aba, keyof Pendencias>>> = {
  aprovacoes: 'aprovacoes',
  modelo: 'orfas',
  fornecedores: 'duplicidades',
}

interface Props {
  readonly ativa: Aba
  readonly onSelecionar: (aba: Aba) => void
  readonly aberta: boolean
}

export function Sidebar({ ativa, onSelecionar, aberta }: Props) {
  const { nome: provedor } = useProvedor()
  const pendencias = usePendencias()
  // Sem acordeão (UX 03/08): o auto-colapso perseguia a aba ativa e fazia a sidebar
  // reflowar a cada troca — mata o vai-e-vem entre 2-3 telas. Tudo visível, zero clique.
  return (
    <aside
      className={`h-dvh shrink-0 overflow-y-auto overflow-x-hidden border-bd bg-surface transition-[width] duration-300 max-md:fixed max-md:left-0 max-md:top-0 max-md:z-40 ${
        aberta ? 'w-64 border-r max-md:shadow-[0_0_60px_rgba(0,0,0,.55)]' : 'w-0'
      }`}
    >
      {/* Largura interna fixa: o texto não quebra durante a animação de recolher. */}
      <div className="flex h-full w-64 flex-col">
        <div className="border-b border-bd px-6 py-5">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1.5 overflow-y-auto p-3">
          <BuscaNav />
          {SECOES.map((secao) => (
            <Camada key={secao.titulo} secao={secao} ativa={ativa} pendencias={pendencias} onSelecionar={onSelecionar} />
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

/**
 * Gatilho VISÍVEL da paleta de abas. O Ctrl+K sempre existiu ligado no App — mas atalho
 * invisível é atalho de quem já sabe; o botão é o que faz o resto descobrir que existe.
 */
function BuscaNav() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('lf-abrir-paleta'))}
      className="mb-1 flex w-full items-center gap-2.5 rounded-lg border border-bd bg-surface2/60 px-3 py-2 text-sm text-muted transition-colors hover:border-primary/50 hover:text-text"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="flex-1 text-left">Buscar função…</span>
      <kbd className="rounded border border-bd bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted/80">Ctrl K</kbd>
    </button>
  )
}

function Camada({
  secao,
  ativa,
  pendencias,
  onSelecionar,
}: {
  secao: Secao
  ativa: Aba
  pendencias: Pendencias
  onSelecionar: (aba: Aba) => void
}) {
  const temAtiva = secao.itens.some((i) => i.id === ativa)
  return (
    <div className="flex flex-col">
      <p
        className={`px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider ${
          temAtiva ? 'text-secondary' : 'text-muted/70'
        }`}
      >
        {secao.titulo}
      </p>
      <div className="ml-2 flex flex-col gap-0.5 border-l border-bd/60 pb-1 pl-2">
        {secao.itens.map((item) => {
          const fila = BADGE_DE[item.id]
          return (
            <ItemNav
              key={item.id}
              item={item}
              ativo={item.id === ativa}
              pendentes={fila ? pendencias[fila] : 0}
              onSelecionar={onSelecionar}
            />
          )
        })}
      </div>
    </div>
  )
}

function ItemNav({
  item,
  ativo,
  pendentes,
  onSelecionar,
}: {
  item: Item
  ativo: boolean
  /** Fila real do item (0 = sem badge — zero NUNCA vira badge). */
  pendentes: number
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
        <IconeNav aba={item.id} />
        <span className="truncate">{item.rotulo}</span>
        {pendentes > 0 ? (
          <span className="ml-auto rounded-full bg-warn/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-warn">
            {pendentes}
          </span>
        ) : null}
      </button>
    </>
  )
}
