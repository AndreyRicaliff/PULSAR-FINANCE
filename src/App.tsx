import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { useTema } from './lib/useTema'
import { AbaAtivaContext } from './lib/abaAtiva'
import { useAutoScrollDrag } from './lib/useAutoScrollDrag'
import { MODO_APRESENTACAO } from './lib/apresentacaoSnapshot'
import { MODO_HUD } from './lib/hudModo'
import { Slideshow } from './components/apresentacao/Slideshow.tsx'
import { HudCliente } from './components/HudCliente.tsx'
import { sair, useAuth, AUTH_ATIVO } from './lib/auth'
import { use2FA } from './lib/doisFatores'
import { CodigoAcesso } from './components/CodigoAcesso.tsx'
import { useAcesso } from './lib/useAcesso'
import { SemAcesso } from './components/SemAcesso.tsx'
import { CadastrosProvider } from './lib/cadastros'
import { ClientesProvider } from './lib/clientes'
import { LancamentosProvider } from './lib/lancamentos'
import { MovimentosProvider } from './lib/movimentos'
import { OverridesProvider } from './lib/overrides'
import { PeriodoProvider } from './lib/periodo'
import { BoasVindas } from './components/BoasVindas.tsx'
import { Sidebar, ROTULO_ABA, type Aba } from './components/Sidebar.tsx'
import { Topbar } from './components/Topbar.tsx'
import { URL_BOOT } from './lib/urlBoot'
import { Carregando, Login } from './components/Login.tsx'
import { ConviteInterstitial, LinkExpirado } from './components/ConviteFluxo.tsx'
import { RecuperarSenha } from './components/RecuperarSenha.tsx'
import { PaletaAbas } from './components/PaletaAbas.tsx'
/**
 * Painel carregado SOB DEMANDA. Eles são exports nomeados, não default, então a adaptação
 * mora aqui em vez de repetir `.then((m) => ({ default: m.X }))` dezesseis vezes.
 *
 * `K extends keyof M` não é enfeite: sem ele o nome seria uma string solta e um typo só
 * apareceria em runtime, ao abrir aquela aba — o `tsc` passaria limpo. Com o genérico, o
 * TypeScript resolve o tipo do módulo importado e recusa nome que não existe lá.
 */
function sobDemanda<M extends Record<string, unknown>, K extends keyof M>(
  importar: () => Promise<M>,
  nome: K,
): ComponentType {
  return lazy(async () => ({ default: (await importar())[nome] as ComponentType }))
}

/**
 * O app inteiro cabia num chunk só de 670 kB: quem abria a área do CLIENTE baixava os 18
 * painéis administrativos para ver um HUD. Cada painel vira uma entrada própria.
 *
 * Dois pontos que NÃO podem virar lazy, e o motivo:
 *
 * - `hud` aponta para o `HudCliente` importado estaticamente lá em cima, porque ele também é
 *   a tela inteira nos modos cliente/kiosk — adiar aqui não economizaria nada e ainda poria
 *   um Suspense no caminho principal do cliente.
 * - O HTML offline da apresentação é UM arquivo: o exportador inlina os `script[src]` do
 *   index.html e não tem como buscar chunk pela rede (`file://`). Isso continua correto
 *   porque o Vite mantém no chunk do entry tudo que é alcançável ESTATICAMENTE a partir
 *   dele — e o `Slideshow` alcança `ConteudoSecao` → relatórios, `IndicadoresPanel` e
 *   `ProjecaoPanel`. Esses três seguem no entry mesmo declarados aqui; o `lazy` deles é
 *   inofensivo, resolve para o próprio chunk. Se um dia o Slideshow passar a fazer
 *   `import()` de verdade, a apresentação offline quebra — é a linha vermelha.
 */
const PAINEIS: Readonly<Record<Aba, ComponentType>> = {
  inicio: sobDemanda(() => import('./components/InicioPanel.tsx'), 'InicioPanel'),
  cadastro: sobDemanda(() => import('./components/CadastroPanel.tsx'), 'CadastroPanel'),
  plano: sobDemanda(() => import('./components/CategoriasPanel.tsx'), 'CategoriasPanel'),
  valores: sobDemanda(() => import('./components/ValoresPanel.tsx'), 'ValoresPanel'),
  fornecedores: sobDemanda(() => import('./components/FornecedoresPanel.tsx'), 'FornecedoresPanel'),
  pagar: sobDemanda(() => import('./components/ContasPanel.tsx'), 'ContasPagarPanel'),
  receber: sobDemanda(() => import('./components/ContasPanel.tsx'), 'ContasReceberPanel'),
  manuais: sobDemanda(() => import('./components/LancamentosManuaisPanel.tsx'), 'LancamentosManuaisPanel'),
  aprovacoes: sobDemanda(() => import('./components/AprovacoesPanel.tsx'), 'AprovacoesPanel'),
  projecao: sobDemanda(() => import('./components/ProjecaoPanel.tsx'), 'ProjecaoPanel'),
  capexcomp: sobDemanda(() => import('./components/ComparativoCapexPanel.tsx'), 'ComparativoCapexPanel'),
  modelo: sobDemanda(() => import('./components/ModeloPanel.tsx'), 'ModeloPanel'),
  demonstracoes: sobDemanda(() => import('./components/DemonstracoesPanel.tsx'), 'DemonstracoesPanel'),
  // `inicial` já tem 'visao' como padrão — o wrapper anterior só repetia o default.
  relatorios: sobDemanda(() => import('./components/RelatoriosPanel.tsx'), 'RelatoriosPanel'),
  apresentacao: sobDemanda(() => import('./components/apresentacoes/ExploradorApresentacoes.tsx'), 'ExploradorApresentacoes'),
  hud: () => <HudCliente />,
  acessos: sobDemanda(() => import('./components/AcessosPanel.tsx'), 'AcessosPanel'),
  config: sobDemanda(() => import('./components/ConfiguracoesPanel.tsx'), 'ConfiguracoesPanel'),
}

export function App() {
  const auth = useAuth()
  const userId = auth.status === 'logado' ? auth.session.user.id : undefined
  const dois = use2FA()
  const acesso = useAcesso(userId, dois.estado === 'liberado')

  // Fluxo do convite ANTES de qualquer gate: a intermediária existe justamente porque o
  // scanner do provedor de e-mail visita o link — só o clique humano dispara a verificação.
  const convite = URL_BOOT.convite
  const linkExpirado = URL_BOOT.linkExpirado
  if (AUTH_ATIVO && convite) return <ConviteInterstitial verifyUrl={convite} />
  if (AUTH_ATIVO && linkExpirado && auth.status !== 'logado') return <LinkExpirado />

  if (AUTH_ATIVO) {
    if (auth.status === 'carregando') return <Carregando />
    if (auth.status === 'deslogado') return <Login />
    // Link de convite/recuperação: definir a senha vem ANTES de qualquer gate — updateUser
    // é Auth API (não passa por RLS), então funciona sem o 2º fator.
    if (auth.status === 'recuperar-senha') return <RecuperarSenha email={auth.email} />
    // O 2º fator vem ANTES de ler o papel: sem ele a RLS devolve zero em painel_acessos,
    // e o app cairia em "sem acesso" em vez de pedir o código.
    if (dois.estado === 'checando') return <Carregando />
    if (dois.estado === 'pendente') return <CodigoAcesso onLiberado={dois.revalidar} />
    if (acesso.carregando) return <Carregando />
    if (acesso.papel === 'nenhum') return <SemAcesso email={auth.email} />
  }

  const email = auth.status === 'logado' ? auth.email : undefined
  // Cliente só enxerga o HUD read-only do seu tenant; operador tem o Shell (e o ?hud de preview).
  const modoCliente = acesso.papel === 'cliente'
  return (
    <>
    <ClientesProvider>
      <CadastrosProvider>
        <LancamentosProvider>
        <MovimentosProvider>
          {MODO_APRESENTACAO ? (
            <OverridesProvider>
              <Slideshow />
            </OverridesProvider>
          ) : modoCliente || MODO_HUD ? (
            <OverridesProvider>
              <HudCliente kiosk />
            </OverridesProvider>
          ) : (
            <Shell email={email} />
          )}
        </MovimentosProvider>
        </LancamentosProvider>
      </CadastrosProvider>
    </ClientesProvider>
    </>
  )
}

/**
 * Espera do chunk do painel. Deliberadamente discreto — `Carregando` é o splash de boot, com
 * fundo de login e min-h-screen; dentro do <main> ele pareceria que o app reiniciou. O chunk
 * chega em milissegundos numa rede normal, e o que não pode acontecer é a troca de aba
 * piscar uma tela cheia.
 */
function PainelCarregando() {
  return <p className="p-8 text-sm text-muted">Carregando…</p>
}

function Shell({ email }: { email?: string }) {
  // A aba sobrevive a reload/deploy — "voltar pro início sozinho" era exatamente isso.
  const [aba, setAba] = useState<Aba>(() => {
    const salva = localStorage.getItem('lf-aba') as Aba | null
    return salva && salva in PAINEIS ? salva : 'inicio'
  })
  useEffect(() => {
    localStorage.setItem('lf-aba', aba)
  }, [aba])
  // Painéis pedem navegação por evento (ex.: Início → "resolver na Matriz").
  useEffect(() => {
    const ouvir = (e: Event) => {
      const alvo = (e as CustomEvent<string>).detail as Aba
      if (alvo in PAINEIS) setAba(alvo)
    }
    window.addEventListener('lf-ir-aba', ouvir)
    return () => window.removeEventListener('lf-ir-aba', ouvir)
  }, [])
  // Navegação sem mouse (UX 03/08): Ctrl/Cmd+K abre o quick-switcher; "/" foca a busca
  // visível do painel (âncora data-campo-busca). Nunca sequestra tecla dentro de campo.
  const [paleta, setPaleta] = useState(false)
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      const emCampo = alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement || alvo?.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaleta(true)
        return
      }
      if (e.key === '/' && !emCampo) {
        const campos = [...document.querySelectorAll<HTMLInputElement>('[data-campo-busca]')]
        const visivel = campos.find((c) => c.offsetParent !== null)
        if (visivel) {
          e.preventDefault()
          visivel.focus()
        }
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])
  // No celular a sidebar é overlay e nasce FECHADA — 240px fixos comiam a tela (revisão).
  const [menuAberto, setMenuAberto] = useState(
    () => window.innerWidth >= 768 && localStorage.getItem('lf-menu') !== '0',
  )
  const [tema, alternarTema] = useTema()
  useEffect(() => {
    localStorage.setItem('lf-menu', menuAberto ? '1' : '0')
  }, [menuAberto])
  useAutoScrollDrag()
  // Abas visitadas ficam MONTADAS (ocultas via CSS): voltar é instantâneo, sem o
  // "carregamento" de remontar painel + refetch a cada troca (report 2026-07-30).
  const [visitadas, setVisitadas] = useState<readonly Aba[]>(() => [aba])
  useEffect(() => {
    setVisitadas((v) => (v.includes(aba) ? v : [...v, aba]))
  }, [aba])

  // Scroll LEMBRADO por aba (UX 03/08): o <main> é um scroller só e o scrollTop vazava
  // entre abas — voltar pra tabela significava re-rolar do zero.
  const mainRef = useRef<HTMLElement>(null)
  const scrollPorAba = useRef<Partial<Record<Aba, number>>>({})
  const abaAnterior = useRef(aba)
  useLayoutEffect(() => {
    const main = mainRef.current
    if (!main) return
    if (abaAnterior.current !== aba) {
      scrollPorAba.current[abaAnterior.current] = main.scrollTop
      main.scrollTop = scrollPorAba.current[aba] ?? 0
      abaAnterior.current = aba
    }
  }, [aba])

  return (
    <OverridesProvider>
      <BoasVindas />
      {paleta ? <PaletaAbas onIr={setAba} onFechar={() => setPaleta(false)} /> : null}
      <div className="flex h-dvh overflow-hidden">
        <Sidebar
          ativa={aba}
          onSelecionar={(a) => {
            setAba(a)
            // Overlay mobile: escolher a aba fecha o menu — senão ele cobre o conteúdo.
            if (window.innerWidth < 768) setMenuAberto(false)
          }}
          aberta={menuAberto}
        />
        {menuAberto ? (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setMenuAberto(false)}
            aria-hidden
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            titulo={ROTULO_ABA[aba]}
            tema={tema}
            onAlternarTema={alternarTema}
            email={email}
            onSair={AUTH_ATIVO ? () => void sair() : undefined}
            menuAberto={menuAberto}
            onAlternarMenu={() => setMenuAberto((v) => !v)}
          />
          <main ref={mainRef} className="fx-grid-bg min-w-0 flex-1 overflow-auto p-4 md:p-8">
            {/* UM período pro Shell inteiro (padrão líder/beto): trocar de aba não reseta
                mais o filtro — os painéis deixaram de montar providers próprios. */}
            <PeriodoProvider>
              {/* max-width (UX 03/08): em ultrawide as tabelas corriam de ponta a ponta —
                  largura de leitura limitada, centrada; o grid de KPIs não muda. */}
              <div className="mx-auto w-full max-w-[1600px]">
                <AbaAtivaContext.Provider value={aba}>
                  {visitadas.map((a) => {
                    const Painel = PAINEIS[a]
                    return (
                      <div key={a} className={a === aba ? 'anim-tab-in' : 'hidden'}>
                        {/* Um Suspense POR painel, não um em volta da lista: com um só,
                            carregar uma aba nova suspenderia o grupo inteiro e trocaria as
                            já visitadas pelo fallback — matando o "voltar é instantâneo"
                            que manter as abas montadas existe para dar. */}
                        <Suspense fallback={<PainelCarregando />}>
                          <Painel />
                        </Suspense>
                      </div>
                    )
                  })}
                </AbaAtivaContext.Provider>
              </div>
            </PeriodoProvider>
          </main>
        </div>
      </div>
    </OverridesProvider>
  )
}
