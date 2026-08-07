import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { CadastroPanel } from './components/CadastroPanel.tsx'
import { InicioPanel } from './components/InicioPanel.tsx'
import { CategoriasPanel } from './components/CategoriasPanel.tsx'
import { ValoresPanel } from './components/ValoresPanel.tsx'
import { FornecedoresPanel } from './components/FornecedoresPanel.tsx'
import { ContasPagarPanel, ContasReceberPanel } from './components/ContasPanel.tsx'
import { LancamentosManuaisPanel } from './components/LancamentosManuaisPanel.tsx'
import { AprovacoesPanel } from './components/AprovacoesPanel.tsx'
import { ProjecaoPanel } from './components/ProjecaoPanel.tsx'
import { ComparativoCapexPanel } from './components/ComparativoCapexPanel.tsx'
import { ModeloPanel } from './components/ModeloPanel.tsx'
import { DemonstracoesPanel } from './components/DemonstracoesPanel.tsx'
import { RelatoriosPanel } from './components/RelatoriosPanel.tsx'
import { ExploradorApresentacoes } from './components/apresentacoes/ExploradorApresentacoes.tsx'
import { ConfiguracoesPanel } from './components/ConfiguracoesPanel.tsx'
import { AcessosPanel } from './components/AcessosPanel.tsx'

const PAINEIS: Readonly<Record<Aba, () => JSX.Element>> = {
  inicio: InicioPanel,
  cadastro: CadastroPanel,
  plano: CategoriasPanel,
  valores: ValoresPanel,
  fornecedores: FornecedoresPanel,
  pagar: ContasPagarPanel,
  receber: ContasReceberPanel,
  manuais: LancamentosManuaisPanel,
  aprovacoes: AprovacoesPanel,
  projecao: ProjecaoPanel,
  capexcomp: ComparativoCapexPanel,
  modelo: ModeloPanel,
  demonstracoes: DemonstracoesPanel,
  relatorios: () => <RelatoriosPanel inicial="visao" />,
  apresentacao: ExploradorApresentacoes,
  hud: () => <HudCliente />,
  acessos: AcessosPanel,
  config: ConfiguracoesPanel,
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
  // Gatilho VISÍVEL da sidebar (v4): mesmo quick-switcher, agora descobrível sem saber o atalho.
  useEffect(() => {
    const abrir = () => setPaleta(true)
    window.addEventListener('lf-abrir-paleta', abrir)
    return () => window.removeEventListener('lf-abrir-paleta', abrir)
  }, [])
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
        {/* UM período pro Shell inteiro (padrão líder/beto). O provider ABRAÇA a Topbar
            desde a v4: os chips de atalho (mês/anterior/3m/ano) moram lá e mexem no MESMO
            filtro global — dois providers dariam dois filtros mentindo um pro outro. */}
        <PeriodoProvider>
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
              {/* max-width (UX 03/08): em ultrawide as tabelas corriam de ponta a ponta —
                  largura de leitura limitada, centrada; o grid de KPIs não muda. */}
              <div className="mx-auto w-full max-w-[1600px]">
                <AbaAtivaContext.Provider value={aba}>
                  {visitadas.map((a) => {
                    const Painel = PAINEIS[a]
                    return (
                      <div key={a} className={a === aba ? 'anim-tab-in' : 'hidden'}>
                        <Painel />
                      </div>
                    )
                  })}
                </AbaAtivaContext.Provider>
              </div>
            </main>
          </div>
        </PeriodoProvider>
      </div>
    </OverridesProvider>
  )
}
