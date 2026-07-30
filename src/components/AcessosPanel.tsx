/** @file Painel de Acessos (operador): cria/reseta/remove logins de cliente via edge manage-user. */
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useClientes } from '@/lib/clientes'
import {
  criarAcesso,
  enviarBoasVindas,
  listarAcessos,
  redefinirSenhaAcesso,
  removerAcesso,
  type AcessoConta,
} from '@/lib/acessos'
import type { Tenant } from '@/core/tenant'
import { supabase } from '@/lib/supabase'

export function AcessosPanel() {
  const { clientes } = useClientes()
  const [contas, setContas] = useState<AcessoConta[] | null>(null)
  const [erro, setErro] = useState('')
  const [novo, setNovo] = useState(false)
  const [convite, setConvite] = useState(false)

  const recarregar = useCallback(async () => {
    setErro('')
    try {
      setContas(await listarAcessos())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao listar acessos')
      setContas([])
    }
  }, [])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold">Acessos</h1>
          <p className="text-sm text-muted">
            Logins de cliente — <strong className="text-text">login + senha</strong>, sem e-mail. Você cria e
            reseta aqui; o cliente entra e vê só o HUD do tenant dele.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConvite(true)}
            className="fx-press rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-white"
          >
            Convidar por e-mail
          </button>
          <button
            type="button"
            onClick={() => setNovo(true)}
            className="fx-press rounded-lg border border-bd px-4 py-2 text-sm font-medium text-muted hover:text-text"
          >
            Novo acesso (login)
          </button>
        </div>
      </header>

      {erro ? (
        <p className="rounded-card border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{erro}</p>
      ) : null}

      {contas === null ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : contas.length === 0 ? (
        <p className="rounded-card border border-bd bg-surface p-6 text-sm text-muted">
          Nenhum acesso ainda — crie o primeiro em “Novo acesso”.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-bd bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-bd text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Login</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Empresas</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => (
                <Linha key={c.user_id} conta={c} onMudou={recarregar} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {novo ? <ModalNovo clientes={clientes} onFechar={() => setNovo(false)} onCriou={recarregar} /> : null}
      {convite ? <ModalConvite clientes={clientes} onFechar={() => setConvite(false)} onCriou={recarregar} /> : null}
    </div>
  )
}

/**
 * Fase 2 dos acessos: conta com E-MAIL REAL. O convidado define a própria senha pelo
 * link (nunca vemos senha), e o 2FA passa a funcionar no inbox dele — pré-requisito
 * para aprovar contas por dentro. O login sintético segue existindo em paralelo.
 */
function ModalConvite({
  clientes,
  onFechar,
  onCriou,
}: {
  clientes: readonly Tenant[]
  onFechar: () => void
  onCriou: () => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [selecionados, setSelecionados] = useState<readonly string[]>([])
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  function alternar(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setErro('')
    const { data, error } = await supabase.functions.invoke('convidar-acesso', {
      body: { email: email.trim(), clienteIds: selecionados },
    })
    if (error || data?.error) {
      setErro(String(data?.error ?? error?.message ?? 'Falha ao convidar'))
      setEnviando(false)
      return
    }
    await onCriou()
    onFechar()
  }

  return (
    <Modal titulo="Convidar por e-mail" onFechar={onFechar}>
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          O convidado recebe um link para definir a própria senha. Com e-mail real, o código
          do 2FA chega nele — e a aprovação de contas passa a valer como assinatura dele.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">E-mail do cliente</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="dono@empresa.com.br" className={CLASSE_INPUT} />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Empresas que ele enxerga</span>
          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-lg border border-bd bg-surface2 p-2">
            {clientes.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface">
                <input type="checkbox" checked={selecionados.includes(c.id)} onChange={() => alternar(c.id)} className="h-4 w-4 accent-[rgb(var(--primary))]" />
                {c.nome}
              </label>
            ))}
          </div>
        </div>
        {erro ? <p className="text-[13px] text-danger">{erro}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="rounded-lg border border-bd px-4 py-2 text-sm text-muted hover:text-text">Cancelar</button>
          <button type="submit" disabled={enviando || !selecionados.length} className="fx-press rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {enviando ? 'Enviando…' : 'Enviar convite'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Linha({ conta, onMudou }: { conta: AcessoConta; onMudou: () => Promise<void> }) {
  const [resetar, setResetar] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  async function remover() {
    if (!confirm(`Remover o acesso "${conta.login}"? A conta de login será excluída.`)) return
    setRemovendo(true)
    try {
      await removerAcesso(conta.user_id)
      await onMudou()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao remover')
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <tr className="border-b border-bd/50 last:border-0">
      <td className="px-4 py-3 font-medium">{conta.login}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
            conta.papel === 'operador' ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'
          }`}
        >
          {conta.papel}
        </span>
      </td>
      <td className="px-4 py-3 text-muted">
        {conta.papel === 'operador' ? 'todas' : conta.empresas.map((e) => e.nome).join(', ') || '—'}
      </td>
      <td className="px-4 py-3 text-muted">
        {conta.last_sign_in_at ? new Date(conta.last_sign_in_at).toLocaleDateString('pt-BR') : 'nunca'}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setResetar(true)}
            className="rounded-lg border border-bd px-3 py-1 text-xs text-muted hover:border-primary hover:text-text"
          >
            Redefinir senha
          </button>
          <button
            type="button"
            onClick={remover}
            disabled={removendo}
            className="rounded-lg border border-bd px-3 py-1 text-xs text-muted hover:border-danger hover:text-danger disabled:opacity-50"
          >
            Remover
          </button>
        </div>
        {resetar ? <ModalSenha conta={conta} onFechar={() => setResetar(false)} /> : null}
      </td>
    </tr>
  )
}

const CLASSE_INPUT =
  'rounded-lg border border-bd bg-surface2 px-4 py-2.5 text-sm outline-none focus:border-primary'

function ModalSenha({ conta, onFechar }: { conta: AcessoConta; onFechar: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 6) return setErro('A senha precisa ter ao menos 6 caracteres.')
    setErro('')
    setSalvando(true)
    try {
      await redefinirSenhaAcesso(conta.user_id, senha)
      setOk(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao redefinir')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal onFechar={onFechar} titulo={`Redefinir senha · ${conta.login}`}>
      {ok ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-accent">Senha redefinida ✓ Passe a nova senha ao cliente.</p>
          <button type="button" onClick={onFechar} className="rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-white">
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={salvar} className="flex flex-col gap-3">
          <input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Nova senha (mín. 6)" autoFocus required className={CLASSE_INPUT} />
          {erro ? <p className="text-xs text-danger">{erro}</p> : null}
          <button type="submit" disabled={salvando} className="rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {salvando ? '…' : 'Salvar'}
          </button>
        </form>
      )}
    </Modal>
  )
}

function ModalNovo({ clientes, onFechar, onCriou }: { clientes: readonly Tenant[]; onFechar: () => void; onCriou: () => Promise<void> }) {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [emailAviso, setEmailAviso] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  function alternar(id: string) {
    setIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!login.trim()) return setErro('Informe o login.')
    if (senha.length < 6) return setErro('A senha precisa ter ao menos 6 caracteres.')
    if (ids.length === 0) return setErro('Selecione ao menos uma empresa.')
    setErro('')
    setSalvando(true)
    try {
      await criarAcesso(login.trim(), senha, ids, 'cliente')
      // Aviso por e-mail é best-effort: a CONTA já existe; falha de e-mail não desfaz nada,
      // só avisa o operador para reenviar por outro canal.
      if (emailAviso.trim()) {
        const nomeEmpresa = clientes.find((c) => c.id === ids[0])?.nome ?? login.trim()
        try {
          await enviarBoasVindas(emailAviso.trim(), login.trim(), nomeEmpresa)
        } catch (e) {
          window.alert(`Conta criada, mas o e-mail de boas-vindas falhou: ${e instanceof Error ? e.message : e}`)
        }
      }
      await onCriou()
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao criar acesso')
      setSalvando(false)
    }
  }

  return (
    <Modal onFechar={onFechar} titulo="Novo acesso de cliente">
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-muted">
          Login
          <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="ex.: autag" autoComplete="off" autoFocus required className={CLASSE_INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-muted">
          Senha
          <input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mín. 6 caracteres" autoComplete="off" required className={CLASSE_INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-muted">
          E-mail de contato (opcional — recebe o aviso de acesso)
          <input type="email" value={emailAviso} onChange={(e) => setEmailAviso(e.target.value)} placeholder="cliente@empresa.com.br" autoComplete="off" className={CLASSE_INPUT} />
          <span className="normal-case tracking-normal text-[10px] text-muted/70">O aviso leva login e link — a senha você entrega por outro canal.</span>
        </label>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-xs uppercase tracking-wide text-muted">Empresas que o cliente vê</legend>
          <div className="flex max-h-40 flex-col gap-1 overflow-auto rounded-lg border border-bd bg-surface2 p-2">
            {clientes.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface3">
                <input type="checkbox" checked={ids.includes(c.id)} onChange={() => alternar(c.id)} />
                {c.nome}
              </label>
            ))}
          </div>
        </fieldset>
        {erro ? <p className="text-xs text-danger">{erro}</p> : null}
        <button type="submit" disabled={salvando} className="mt-1 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {salvando ? '…' : 'Criar acesso'}
        </button>
      </form>
    </Modal>
  )
}

function Modal({ titulo, children, onFechar }: { titulo: string; children: ReactNode; onFechar: () => void }) {
  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div className="anim-pop w-full max-w-xl rounded-card border border-bd bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-bold">{titulo}</h2>
        {children}
      </div>
    </div>
  )
}
