/** @file Barra superior: cliente ativo, atalhos de período, música, tema, senha e sessão. */
import { useMemo, useState } from 'react'
import type { Preset } from '@/core/periodo'
import { rotulosProvedor } from '@/core/provedor'
import type { Tenant } from '@/core/tenant'
import { useClientes } from '@/lib/clientes'
import { usePeriodoTalvez } from '@/lib/periodo'
import { useSomMaster } from '@/lib/useMusicaAmbiente'
import type { Tema } from '@/lib/useTema'
import { DefinirSenha } from './DefinirSenha.tsx'
import { SeletorBusca } from './SeletorBusca.tsx'
import { SeloSync } from './SeloSync.tsx'

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
  const [senhaAberta, setSenhaAberta] = useState(false)
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-bd bg-bg/80 px-4 py-3 backdrop-blur md:gap-4 md:px-8 md:py-4">
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
        {/* Sem o eyebrow "Pulsar Finance" (v4): a marca já está na sidebar — repetir aqui
            só empurrava o título pra baixo. */}
        <h1 className="text-lg font-bold tracking-tight">{titulo}</h1>
        <ChipsPeriodo />
      </div>
      <div className="flex items-center gap-3">
        <SeloSync />
        <SeletorCliente />
        <ToggleMusica />
        <ToggleTema tema={tema} onAlternar={onAlternarTema} />
        {email ? <span className="hidden text-sm text-muted lg:inline">{email}</span> : null}
        {/* hover não move layout (v4): cor e borda respondem; scale saiu. */}
        <button
          type="button"
          onClick={() => setSenhaAberta(true)}
          title="Definir senha"
          className="grid h-9 w-9 place-items-center rounded-lg border border-bd bg-surface text-muted transition-colors hover:border-primary hover:text-primary"
        >
          <IconeChave />
        </button>
        {onSair ? (
          <button
            type="button"
            onClick={onSair}
            title="Sair"
            className="grid h-9 w-9 place-items-center rounded-lg border border-bd bg-surface text-muted transition-colors hover:border-danger hover:text-danger"
          >
            <IconeSair />
          </button>
        ) : null}
      </div>
      {senhaAberta ? <DefinirSenha email={email} onFechar={() => setSenhaAberta(false)} /> : null}
    </header>
  )
}

/**
 * Atalhos do período GLOBAL na barra (v4): o filtro já era um só para o app inteiro —
 * faltava o acesso de um clique. Some sem provider (HUD kiosk) e em tela estreita.
 */
const CHIPS: readonly { preset: Preset; rotulo: string }[] = [
  { preset: 'mes-atual', rotulo: 'Mês' },
  { preset: 'mes-anterior', rotulo: 'Anterior' },
  { preset: '3m', rotulo: '3m' },
  { preset: 'ano', rotulo: 'Ano' },
]

function ChipsPeriodo() {
  const periodo = usePeriodoTalvez()
  if (!periodo) return null
  return (
    <div className="hidden items-center gap-1 lg:flex">
      {CHIPS.map((c) => (
        <button
          key={c.preset}
          type="button"
          onClick={() => periodo.definirPreset(c.preset)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            periodo.preset === c.preset
              ? 'border-primary bg-primary/15 text-secondary'
              : 'border-bd bg-surface text-muted hover:border-primary/50 hover:text-text'
          }`}
        >
          {c.rotulo}
        </button>
      ))}
    </div>
  )
}

function SeletorCliente() {
  const { clientes, ativo, selecionar } = useClientes()
  // Mesma loja pode existir em Omie E Nibo (re-onboarding). Nomes repetidos ganham o provedor
  // no rótulo da opção — o <select> nativo só aceita texto, então a etiqueta vai no label.
  const repetidos = useMemo(() => {
    const cont = new Map<string, number>()
    for (const c of clientes) cont.set(c.nome, (cont.get(c.nome) ?? 0) + 1)
    return new Set([...cont].filter(([, n]) => n > 1).map(([nome]) => nome))
  }, [clientes])
  const rotulo = (c: Tenant) =>
    repetidos.has(c.nome) ? `${c.nome} · ${rotulosProvedor(c.provedor).nome}` : c.nome
  // Agrupado por ERP e alfabético (report 2026-07-30) — agora com BUSCA (pedido 03/08):
  // 24 tenants em <select> nativo era caça ao nome sem filtro.
  const opcoes = useMemo(
    () =>
      (['omie', 'nibo', null] as const).flatMap((prov) =>
        clientes
          .filter((c) => (c.provedor ?? null) === prov)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
          .map((c) => ({ valor: c.id, rotulo: rotulo(c), detalhe: prov ? rotulosProvedor(prov).nome : 'sem integração' })),
      ),
    [clientes, repetidos],
  )
  return (
    <label className="flex items-center gap-2 rounded-lg border border-bd bg-surface px-2.5 py-1.5">
      {/* Avatar com a inicial, não o dot "ao vivo" (v4): o pulso-vivo é reservado a dado
          REALTIME de verdade (§5 do index.css) — aqui não há nenhum. */}
      <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md bg-primary/15 text-[11px] font-bold text-secondary">
        {ativo.nome.trim().charAt(0).toUpperCase() || '?'}
      </span>
      <SeletorBusca
        opcoes={opcoes}
        valor={ativo.id}
        onEscolher={selecionar}
        placeholderBusca="Buscar cliente…"
        classeGatilho="flex max-w-[44vw] items-center gap-1.5 bg-transparent text-left text-sm font-semibold text-text outline-none sm:max-w-none"
      />
      <TagProvedor provedor={ativo.provedor} />
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-muted" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  )
}

function IconeChave() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.9 12.1 8.8-8.8M15 7l3 3" />
    </svg>
  )
}

function IconeSair() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

/** Etiqueta sóbria do ERP do cliente ativo (sempre visível — some quando não há integração). */
export function TagProvedor({ provedor }: { provedor: Tenant['provedor'] }) {
  if (!provedor) return null
  const cor = provedor === 'nibo' ? 'text-secondary border-secondary/40' : 'text-accent border-accent/40'
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cor}`}>
      {rotulosProvedor(provedor).nome}
    </span>
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
      className={`fx-press grid h-9 w-9 place-items-center rounded-lg border border-bd bg-surface transition-colors hover:border-primary ${
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
      className="flex items-center gap-2 rounded-lg border border-bd bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-primary hover:text-text"
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
