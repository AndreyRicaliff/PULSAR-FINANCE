import { useEffect, useState } from 'react'
import { useTema } from './lib/useTema'
import { useAutoScrollDrag } from './lib/useAutoScrollDrag'
import { MODO_APRESENTACAO } from './lib/apresentacaoSnapshot'
import { Slideshow } from './components/apresentacao/Slideshow.tsx'
import { sair, useAuth, AUTH_ATIVO } from './lib/auth'
import { CadastrosProvider } from './lib/cadastros'
import { ClientesProvider } from './lib/clientes'
import { MovimentosProvider } from './lib/movimentos'
import { OverridesProvider } from './lib/overrides'
import { BoasVindas } from './components/BoasVindas.tsx'
import { Sidebar, ROTULO_ABA, type Aba } from './components/Sidebar.tsx'
import { Topbar } from './components/Topbar.tsx'
import { Carregando, Login } from './components/Login.tsx'
import { CadastroPanel } from './components/CadastroPanel.tsx'
import { CategoriasPanel } from './components/CategoriasPanel.tsx'
import { ValoresPanel } from './components/ValoresPanel.tsx'
import { FornecedoresPanel } from './components/FornecedoresPanel.tsx'
import { ContasPagarPanel, ContasReceberPanel } from './components/ContasPanel.tsx'
import { ProjecaoPanel } from './components/ProjecaoPanel.tsx'
import { ModeloPanel } from './components/ModeloPanel.tsx'
import { DemonstracoesPanel } from './components/DemonstracoesPanel.tsx'
import { RelatoriosPanel } from './components/RelatoriosPanel.tsx'
import { ConfiguracoesPanel } from './components/ConfiguracoesPanel.tsx'

const PAINEIS: Readonly<Record<Aba, () => JSX.Element>> = {
  cadastro: CadastroPanel,
  plano: CategoriasPanel,
  valores: ValoresPanel,
  fornecedores: FornecedoresPanel,
  pagar: ContasPagarPanel,
  receber: ContasReceberPanel,
  projecao: ProjecaoPanel,
  modelo: ModeloPanel,
  demonstracoes: DemonstracoesPanel,
  relatorios: () => <RelatoriosPanel inicial="visao" />,
  apresentacao: () => <RelatoriosPanel inicial="apresentacao" />,
  config: ConfiguracoesPanel,
}

export function App() {
  const auth = useAuth()

  if (AUTH_ATIVO) {
    if (auth.status === 'carregando') return <Carregando />
    if (auth.status === 'deslogado') return <Login />
  }

  const email = auth.status === 'logado' ? auth.email : undefined
  return (
    <>
    <ClientesProvider>
      <CadastrosProvider>
        <MovimentosProvider>
          {MODO_APRESENTACAO ? (
            <OverridesProvider>
              <Slideshow />
            </OverridesProvider>
          ) : (
            <Shell email={email} />
          )}
        </MovimentosProvider>
      </CadastrosProvider>
    </ClientesProvider>
    </>
  )
}

function Shell({ email }: { email?: string }) {
  const [aba, setAba] = useState<Aba>('plano')
  const [menuAberto, setMenuAberto] = useState(() => localStorage.getItem('lf-menu') !== '0')
  const [tema, alternarTema] = useTema()
  useEffect(() => {
    localStorage.setItem('lf-menu', menuAberto ? '1' : '0')
  }, [menuAberto])
  useAutoScrollDrag()
  const Painel = PAINEIS[aba]

  return (
    <OverridesProvider>
      <BoasVindas />
      <div className="flex h-dvh overflow-hidden">
        <Sidebar ativa={aba} onSelecionar={setAba} aberta={menuAberto} />
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
          <main className="fx-grid-bg min-w-0 flex-1 overflow-auto p-8">
            <div key={aba} className="anim-tab-in">
              <Painel />
            </div>
          </main>
        </div>
      </div>
    </OverridesProvider>
  )
}
