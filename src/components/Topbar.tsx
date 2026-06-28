/** @file Barra superior: cliente ativo, música ambiente, tema e sessão. */
import { useClientes } from '@/lib/clientes'
import { useSomMaster } from '@/lib/useMusicaAmbiente'
import type { Tema } from '@/lib/useTema'

interface Props {
  readonly titulo: string
  readonly tema: Tema
  readonly onAlternarTema: () => void
  readonly email?: string
  readonly onSair?: () => void
  readonly menuAberto: boolean
  readonly onAlternarMenu: () => void
}

export function Topbar({ titulo, tema, onAlternarTema, email, onSair, menuAberto, onAlternarMenu }: Props) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-bd bg-bg/80 px-8 py-4 backdrop-blur">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onAlternarMenu}
          aria-label={menuAberto ? 'Ocultar menu' : 'Mostrar menu'}
          title={menuAberto ? 'Ocultar menu' : 'Mostrar menu'}
          className="fx-press grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-bd bg-surface text-muted transition-colors hover:border-primary hover:text-text"
        >
          <IconeMenu />
        </button>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Pulsar Finance</p>
          <h1 className="text-lg font-bold tracking-tight">{titulo}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SeletorCliente />
        <ToggleMusica />
        <ToggleTema tema={tema} onAlternar={onAlternarTema} />
        {email ? <span className="hidden text-sm text-muted lg:inline">{email}</span> : null}
        {onSair ? (
          <button
            type="button"
            onClick={onSair}
            title="Sair"
            className="grid h-9 w-9 place-items-center rounded-lg border border-bd bg-surface text-base text-muted transition-all duration-200 hover:scale-105 hover:text-danger"
          >
            ⎋
          </button>
        ) : null}
      </div>
    </header>
  )
}

function SeletorCliente() {
  const { clientes, ativo, selecionar } = useClientes()
  return (
    <label className="flex items-center gap-2 rounded-lg border border-bd bg-surface px-3 py-1.5">
      <span className="pulso-vivo h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--c-accent)/0.6)]" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Cliente</span>
      <select
        value={ativo.id}
        onChange={(e) => selecionar(e.target.value)}
        className="bg-transparent text-sm font-semibold text-text outline-none"
      >
        {clientes.map((c) => (
          <option key={c.id} value={c.id} className="bg-surface text-text">
            {c.nome}
          </option>
        ))}
      </select>
    </label>
  )
}

function ToggleMusica() {
  const som = useSomMaster()
  return (
    <button
      type="button"
      onClick={som.alternar}
      aria-label={som.ligado ? 'Desligar todos os sons' : 'Ligar sons'}
      title={som.ligado ? 'Som: ligado (música, efeitos e intro)' : 'Som: desligado'}
      className={`fx-press grid h-9 w-9 place-items-center rounded-lg border border-bd bg-surface transition-all duration-200 hover:scale-105 ${
        som.ligado ? 'text-secondary' : 'text-muted opacity-60'
      }`}
    >
      <IconeNota pulsando={som.ligado} />
    </button>
  )
}

function IconeNota({ pulsando }: { pulsando: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={pulsando ? 'pulso-vivo' : undefined}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function ToggleTema({ tema, onAlternar }: { tema: Tema; onAlternar: () => void }) {
  const claro = tema === 'light'
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-label={claro ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={claro ? 'Modo escuro' : 'Modo claro'}
      className="flex items-center gap-2 rounded-lg border border-bd bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-all duration-200 hover:scale-105 hover:text-text"
    >
      {claro ? <IconeLua /> : <IconeSol />}
      <span className="hidden sm:inline">{claro ? 'Escuro' : 'Claro'}</span>
    </button>
  )
}

function IconeMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

function IconeSol() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </svg>
  )
}

function IconeLua() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}
