/**
 * @file HUD do cliente: visualização apresentativa que alterna entre DRE, DFC e detalhamento de conta.
 * Só delega às funções JÁ existentes do painel (useResultado → RelatorioDRE/DFC + motor de drill-down);
 * zero lógica de negócio nova, zero criação de relatório, sem a camada semântica do operador.
 */
import { useMemo, useState } from 'react'
import { separarNeutros } from '@/core/neutros'
import type { Movimento } from '@/core/movimento'
import { rotuloIntervalo } from '@/core/periodo'
import { sair } from '@/lib/auth'
import { useClientes } from '@/lib/clientes'
import { FilialSelecaoProvider } from '@/lib/filialSelecao'
import { useOverrides } from '@/lib/overrides'
import { PeriodoProvider } from '@/lib/periodo'
import { SomenteLeituraProvider } from '@/lib/somenteLeitura'
import { useTema } from '@/lib/useTema'
import { useResultado } from '@/lib/useResultado'
import { DefinirSenha } from './DefinirSenha.tsx'
import { Logo } from './Logo.tsx'
import { ResumoPeriodo } from './ResumoPeriodo.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'
import { IndicadoresPanel } from './IndicadoresPanel.tsx'
import { FiltroPeriodo } from './relatorios/FiltroPeriodo.tsx'
import { RelatorioDRE } from './relatorios/RelatorioDRE.tsx'
import { RelatorioDFC } from './relatorios/RelatorioDFC.tsx'
import { RelatorioEvolucao } from './relatorios/RelatorioEvolucao.tsx'
import { ramificar } from './drilldown/arvoreMov'
import { EixoChain } from './drilldown/EixoChain.tsx'
import { GrupoArvore } from './drilldown/GrupoArvore.tsx'
import { TabelaMov } from './drilldown/TabelaMov.tsx'
import type { Eixo } from './drilldown/rotulos'

type VistaHud = 'indicadores' | 'dre' | 'dfc' | 'evolucao' | 'detalhamento'

const VISTAS: readonly OpcaoSeg<VistaHud>[] = [
  { id: 'indicadores', rotulo: 'Indicadores' },
  { id: 'dre', rotulo: 'DRE' },
  { id: 'dfc', rotulo: 'Fluxo de Caixa' },
  { id: 'evolucao', rotulo: 'Evolução & Projeção' },
  { id: 'detalhamento', rotulo: 'Detalhamento de Conta' },
]

/**
 * HUD apresentativo do cliente. `kiosk` = tela cheia própria (rota ?hud, sem sidebar do operador);
 * embutido (sem kiosk) = renderiza dentro do Shell para o operador pré-visualizar.
 */
export function HudCliente({ kiosk = false }: { kiosk?: boolean }) {
  // Todo o HUD é read-only: o cliente não edita a camada semântica (renomear/override/atribuir).
  return (
    <PeriodoProvider>
      <SomenteLeituraProvider>{kiosk ? <Kiosk /> : <Embedded />}</SomenteLeituraProvider>
    </PeriodoProvider>
  )
}

const ICONE: Readonly<Record<VistaHud, string>> = {
  indicadores: '▦',
  dre: '≣',
  dfc: '◵',
  evolucao: '⇗',
  detalhamento: '☰',
}

/** Casco tela-cheia do modo cliente: sidebar Pulsar (marca + empresa + navegação + tema), nada do operador. */
function Kiosk() {
  const [vista, setVista] = useState<VistaHud>('indicadores')
  const [tema, alternarTema] = useTema()
  const [modalSenha, setModalSenha] = useState(false)
  const { clientes, ativo, selecionar } = useClientes()
  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col border-r border-bd bg-surface">
        <div className="border-b border-bd px-5 py-5">
          <Logo size={30} />
        </div>
        {clientes.length > 1 ? (
          // Grupo (ex.: AUTAG 36/27): o cliente alterna só entre as empresas dele (RLS já filtra a lista).
          <div className="flex flex-col gap-1 border-b border-bd px-3 py-3">
            <span className="px-1 pb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted/70">Empresa</span>
            {clientes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selecionar(c.id)}
                className={`rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                  c.id === ativo.id ? 'bg-primary/15 font-semibold text-secondary' : 'text-muted hover:text-text'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        ) : (
          <div className="border-b border-bd px-5 py-3 text-sm font-semibold text-text">{ativo.nome}</div>
        )}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {VISTAS.map((v) => (
            <ItemNav key={v.id} rotulo={v.rotulo} icone={ICONE[v.id]} ativo={v.id === vista} onClick={() => setVista(v.id)} />
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t border-bd p-3">
          <button
            type="button"
            onClick={() => setModalSenha(true)}
            className="fx-press w-full rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm text-muted hover:border-primary hover:text-text"
          >
            Definir senha
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={alternarTema}
              className="fx-press flex-1 rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm text-muted hover:border-primary hover:text-text"
            >
              {tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
            </button>
            <button
              type="button"
              onClick={() => void sair()}
              className="fx-press rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm text-muted hover:border-danger hover:text-danger"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>
      <main className="fx-grid-bg min-w-0 flex-1 overflow-auto p-8">
        <Corpo vista={vista} />
      </main>
      {modalSenha ? <DefinirSenha onFechar={() => setModalSenha(false)} /> : null}
    </div>
  )
}

function ItemNav({ rotulo, icone, ativo, onClick }: { rotulo: string; icone: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
        ativo ? 'bg-primary text-white' : 'text-muted hover:translate-x-0.5 hover:bg-surface2 hover:text-text'
      }`}
    >
      <span className="w-5 text-center text-base">{icone}</span>
      {rotulo}
    </button>
  )
}

/** Preview do operador (dentro do Shell): navegação por abas de topo, já que a sidebar é a do operador. */
function Embedded() {
  const [vista, setVista] = useState<VistaHud>('indicadores')
  return (
    <div className="flex flex-col gap-6">
      <Segmento opcoes={VISTAS} valor={vista} onTrocar={setVista} />
      <Corpo vista={vista} />
    </div>
  )
}

function Corpo({ vista }: { vista: VistaHud }) {
  const { dre, dfc, grupos, periodo, movimentos, conc } = useResultado()
  // Igual aos relatórios: o apresentativo mostra só o operacional; neutros (Regra Mãe) ficam fora.
  const { operacionais, neutros } = useMemo(() => separarNeutros(movimentos, conc), [movimentos, conc])

  return (
    <div className="flex flex-col gap-6">
      <FiltroPeriodo info={periodo} />
      <ResumoPeriodo
        contexto="periodo"
        rotulo={`Visualizando ${rotuloIntervalo(periodo.intervalo)} · regime ${periodo.regime}${
          neutros.length ? ` · ${neutros.length} neutros fora` : ''
        }`}
        movimentos={operacionais}
        regime={periodo.regime}
        conc={conc}
      />
      <div key={vista} className="anim-tab-in">
        {vista === 'indicadores' ? <IndicadoresPanel /> : null}
        {vista === 'dre' ? <RelatorioDRE dre={dre} grupos={grupos} /> : null}
        {vista === 'dfc' ? <RelatorioDFC dfc={dfc} /> : null}
        {vista === 'evolucao' ? <RelatorioEvolucao /> : null}
        {vista === 'detalhamento' ? <Detalhamento movimentos={operacionais} /> : null}
      </div>
    </div>
  )
}

/**
 * Detalhamento de conta: mesma árvore de drill-down do MovimentosModal, porém inline e read-only.
 * Reusa o motor existente (ramificar + EixoChain + GrupoArvore/TabelaMov); começa agrupado por categoria.
 */
function Detalhamento({ movimentos }: { movimentos: readonly Movimento[] }) {
  const { resolvedor } = useOverrides()
  const [eixos, setEixos] = useState<Eixo[]>(['categoria'])
  const arvore = useMemo(() => ramificar(movimentos, eixos, resolvedor), [movimentos, eixos, resolvedor])
  return (
    <FilialSelecaoProvider>
      <div className="flex flex-col gap-3">
        <div className="rounded-card border border-bd bg-surface p-4">
          <EixoChain eixos={eixos} onChange={setEixos} />
        </div>
        <div className="overflow-hidden rounded-card border border-bd bg-surface">
          {eixos.length === 0 ? (
            <TabelaMov movimentos={movimentos} />
          ) : (
            arvore.map((no) => <GrupoArvore key={no.chave} no={no} nivel={0} />)
          )}
        </div>
      </div>
    </FilialSelecaoProvider>
  )
}
