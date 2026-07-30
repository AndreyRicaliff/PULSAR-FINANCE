/** @file Barra superior: cliente ativo, música ambiente, tema, definir senha e sessão. */
import { useMemo, useState } from 'react'
import { rotulosProvedor } from '@/core/provedor'
import type { Tenant } from '@/core/tenant'
import { useClientes } from '@/lib/clientes'
import { useSomMaster } from '@/lib/useMusicaAmbiente'
import type { Tema } from '@/lib/useTema'
import { DefinirSenha } from './DefinirSenha.tsx'
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
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Pulsar Finance</p>
          <h1 className="text-lg font-bold tracking-tight">{titulo}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SeloSync />
        <SeletorCliente />
        <ToggleMusica />
        <ToggleTema tema={tema} onAlternar={onAlternarTema} />
        {email ? <span className="hidden text-sm text-muted lg:inline">{email}</span> : null}
        <button
          type="button"
          onClick={() => setSenhaAberta(true)}
          title="Definir senha"
          className="grid h-9 w-9 place-items-center rounded-lg border border-bd bg-surface text-base text-muted transition-all duration-200 hover:scale-105 hover:text-primary"
        >
          ⚿
        </button>
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
      {senhaAberta ? <DefinirSenha email={email} onFechar={() => setSenhaAberta(false)} /> : null}
    </header>
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
  return (
    <label className="flex items-center gap-2 rounded-lg border border-bd bg-surface px-3 py-1.5">
      <span className="pulso-vivo h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--c-accent)/0.6)]" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Cliente</span>
      <select
        value={ativo.id}
        onChange={(e) => selecionar(e.target.value)}
        className="max-w-[44vw] bg-transparent text-sm font-semibold text-text outline-none sm:max-w-none"
      >
        {/* Agrupado por ERP e alfabético dentro de cada grupo — a lista crescia na ordem
            de cadastro e virou caça ao nome (report 2026-07-30). */}
        {(['omie', 'nibo', null] as const).map((prov) => {
          const grupo = clientes
            .filter((c) => (c.provedor ?? null) === prov)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
          if (!grupo.length) return null
          return (
            <optgroup key={prov ?? 'sem'} label={prov ? rotulosProvedor(prov).nome : 'Sem integração'}>
              {grupo.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface text-text">
                  {rotulo(c)}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
      <TagProvedor provedor={ativo.provedor} />
    </label>
  )
}

/** Etiqueta sóbria do ERP do cliente ativo (sempre visível — some quando não há integração). */
function TagProvedor({ provedor }: { provedor: Tenant['provedor'] }) {
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
