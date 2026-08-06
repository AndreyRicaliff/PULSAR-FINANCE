/**
 * @file HUD do cliente: visualização apresentativa que alterna entre DRE, DFC e detalhamento de conta.
 * Só delega às funções JÁ existentes do painel (useResultado → RelatorioDRE/DFC + motor de drill-down);
 * zero lógica de negócio nova, zero criação de relatório, sem a camada semântica do operador.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { separarNeutros } from '@/core/neutros'
import type { Movimento } from '@/core/movimento'
import { rotuloIntervalo } from '@/core/periodo'
import { sair } from '@/lib/auth'
import { useCadastros } from '@/lib/cadastros'
import { useClientes } from '@/lib/clientes'
import { FilialSelecaoProvider } from '@/lib/filialSelecao'
import { useOverrides } from '@/lib/overrides'
import { PeriodoProvider } from '@/lib/periodo'
import { SomenteLeituraProvider } from '@/lib/somenteLeitura'
import { useSync } from '@/lib/useSync'
import { useTema } from '@/lib/useTema'
import { useMovimentos } from '@/lib/movimentos'
import { AprovacoesCliente } from './AprovacoesCliente.tsx'
import { MancheteCliente } from './cliente/MancheteCliente.tsx'
import { temaPorId } from '@/core/temaApresentacao'
import { varsDoPainel, type Canais } from '@/core/temaPainel'
import { useFicha } from '@/lib/ficha'
import { MarcaCliente } from './cliente/MarcaCliente.tsx'
import { RelatoriosPublicados } from './cliente/RelatoriosPublicados.tsx'
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

type VistaHud = 'indicadores' | 'relatorios' | 'aprovacoes' | 'dre' | 'dfc' | 'evolucao' | 'detalhamento'

/**
 * Linguagem de DONO — o inverso do menu do operador, que é técnico de propósito. Quem abre
 * aqui não procura "DRE", procura "quanto sobrou". A sigla fica como legenda, para não
 * perder quem já conhece o termo do contador.
 */
const VISTAS: readonly OpcaoSeg<VistaHud>[] = [
  { id: 'indicadores', rotulo: 'Meu resumo' },
  { id: 'relatorios', rotulo: 'Meus relatórios' },
  { id: 'aprovacoes', rotulo: 'Contas a aprovar' },
  { id: 'dre', rotulo: 'Resultado do mês' },
  { id: 'dfc', rotulo: 'Entradas e saídas' },
  { id: 'evolucao', rotulo: 'Como venho indo' },
  { id: 'detalhamento', rotulo: 'Ver lançamentos' },
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

/** Surfaces reais do index.css — o ajuste de legibilidade do acento e' medido contra elas. */
const SURFACE_ESCURO: Canais = [20, 20, 40]
const SURFACE_CLARO: Canais = [253, 252, 255]

const ICONE: Readonly<Record<VistaHud, string>> = {
  indicadores: '▦',
  relatorios: '◈',
  aprovacoes: '✓',
  dre: '≣',
  dfc: '◵',
  evolucao: '⇗',
  detalhamento: '☰',
}

/** Casco tela-cheia do modo cliente: sidebar Pulsar (marca + empresa + navegação + tema), nada do operador. */
function Kiosk() {
  const [vista, setVista] = useState<VistaHud>('indicadores')
  // Drawer mobile: o dono acessa do celular — sidebar fixa de 240px inviabilizava (revisao 2026-07-29)
  const [menuAberto, setMenuAberto] = useState(false)
  const irPara = (v: VistaHud) => {
    setVista(v)
    setMenuAberto(false)
  }
  const [tema, alternarTema] = useTema()
  const [modalSenha, setModalSenha] = useState(false)
  const { clientes, ativo, selecionar } = useClientes()
  const { ficha } = useFicha()
  // O tema da ficha deixa de valer só nas apresentacoes e passa a pintar o PAINEL dele.
  // Só os acentos: as superficies carregam o contraste medido, e trocá-las por cor de
  // marca devolveria o problema de legibilidade corrigido em 06/08.
  const vars = varsDoPainel(
    temaPorId(ficha.temaPadrao, ficha.temasCustom),
    tema === 'dark' ? SURFACE_ESCURO : SURFACE_CLARO,
  )
  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row" style={vars}>
      <header className="flex items-center justify-between border-b border-bd bg-surface px-4 py-3 md:hidden">
        <MarcaCliente size={22} />
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          className="fx-press rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-sm text-muted"
        >
          ☰ Menu
        </button>
      </header>
      {menuAberto ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-bd bg-surface transition-transform md:static md:z-auto md:shrink-0 md:translate-x-0 ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-bd px-5 py-5">
          <MarcaCliente size={30} />
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
            <ItemNav key={v.id} rotulo={v.rotulo} icone={ICONE[v.id]} ativo={v.id === vista} onClick={() => irPara(v.id)} />
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t border-bd p-3">
          <BotaoAtualizarDados />
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
      <main className="fx-grid-bg min-w-0 flex-1 overflow-auto p-4 md:p-8">
        <Corpo vista={vista} />
      </main>
      {modalSenha ? <DefinirSenha onFechar={() => setModalSenha(false)} /> : null}
    </div>
  )
}

/**
 * Sync sob demanda pelo PRÓPRIO cliente (pedido 03/08 — "qualquer conta sincroniza").
 * A edge escopa por vínculo (cliente só o próprio tenant) e aplica cooldown de 10 min;
 * aqui é só o disparo + recarga das fontes na transição rodando→ok.
 */
function BotaoAtualizarDados() {
  const { ativo } = useClientes()
  const sync = useSync(ativo.id, ativo.nome)
  const { recarregar } = useMovimentos()
  const { recarregar: recarregarCadastros } = useCadastros()
  const rodando = sync.status === 'rodando'
  const statusAnterior = useRef(sync.status)
  useEffect(() => {
    if (statusAnterior.current === 'rodando' && sync.status === 'ok') {
      void recarregar()
      void recarregarCadastros()
    }
    statusAnterior.current = sync.status
  }, [sync.status, recarregar, recarregarCadastros])
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void sync.sincronizar()}
        disabled={rodando}
        className="fx-press w-full rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm text-muted transition-colors hover:border-primary hover:text-text disabled:opacity-60"
      >
        {rodando ? 'Atualizando…' : 'Atualizar dados'}
      </button>
      {sync.status === 'erro' ? <p className="px-1 text-[11px] leading-snug text-danger">{sync.msg}</p> : null}
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
  const fonte = useMovimentos()
  // Igual aos relatórios: o apresentativo mostra só o operacional; neutros (Regra Mãe) ficam fora.
  const { operacionais, neutros } = useMemo(() => separarNeutros(movimentos, conc), [movimentos, conc])

  // Gate dos 5 estados: zeros só depois da fonte responder — número piscando de 0 pro real
  // é dado falso na vitrine do cliente (revisão 2026-07-29).
  if (fonte.status === 'carregando') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-bd bg-surface p-12 text-center">
        <span className="pulso-vivo h-2 w-2 rounded-full bg-secondary" />
        <p className="text-sm text-muted">Carregando seus dados…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {fonte.status === 'erro' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-danger/40 bg-danger/10 px-4 py-3">
          <p className="text-sm font-medium text-danger">
            Não foi possível carregar seus dados — os valores abaixo podem estar incompletos.
          </p>
          <button
            type="button"
            onClick={() => void fonte.recarregar()}
            className="fx-press rounded-lg border border-danger/50 px-3 py-1.5 text-xs font-semibold text-danger"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}
      {/* A resposta ANTES da ferramenta: a manchete abre a tela, o filtro vem recolhido
          abaixo. Só na vista de resumo — nas outras o cliente já escolheu o que olhar. */}
      {vista === 'indicadores' ? <MancheteCliente /> : null}
      <FiltroPeriodo info={periodo} />
      <ResumoPeriodo
        contexto="periodo"
        rotulo={`Visualizando ${rotuloIntervalo(periodo.intervalo)}${
          neutros.length ? ` · ${neutros.length} transferências fora da conta` : ''
        }`}
        movimentos={operacionais}
        regime={periodo.regime}
        conc={conc}
      />
      <div key={vista} className="anim-tab-in">
        {vista === 'indicadores' ? <IndicadoresPanel /> : null}
        {vista === 'relatorios' ? <RelatoriosPublicados /> : null}
        {vista === 'aprovacoes' ? <AprovacoesCliente /> : null}
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
        <div className="overflow-x-auto rounded-card border border-bd bg-surface">
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
