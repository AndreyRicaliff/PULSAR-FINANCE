/** @file Tela fail-closed: usuário logado sem vínculo em painel_acessos (nenhum cliente liberado). */
import { sair } from '@/lib/auth'
import { Logo, Tagline } from './Logo.tsx'

export function SemAcesso({ email }: { email?: string }) {
  return (
    <div className="fx-grid-bg flex h-dvh flex-col items-center justify-center gap-5 p-8 text-center">
      <Logo size={44} />
      <Tagline />
      <p className="max-w-md text-sm text-muted">
        {email ? <span className="font-medium text-text">{email}</span> : 'Sua conta'} ainda não tem acesso
        liberado a nenhum cliente. Fale com a AG Consultoria para habilitar.
      </p>
      <button
        type="button"
        onClick={() => void sair()}
        className="fx-press rounded-lg border border-bd bg-surface2 px-4 py-2 text-sm text-muted hover:border-primary hover:text-text"
      >
        Sair
      </button>
    </div>
  )
}
