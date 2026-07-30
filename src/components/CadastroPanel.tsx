/** @file Cadastro de clientes (tenants) da AG: criar, ativar e alternar o cliente do BPO. */
import { useState } from 'react'
import { ACME_ID, type Tenant } from '@/core/tenant'
import { useClientes } from '@/lib/clientes'
import { useFicha } from '@/lib/ficha'
import { SeletorTema } from './apresentacoes/SeletorTema.tsx'

/** Ficha da empresa ativa: informações úteis + tema padrão das apresentações dela. */
function FichaEmpresa() {
  const { ativo } = useClientes()
  const { ficha, patch } = useFicha()
  const campo = 'rounded-lg border border-bd bg-surface2 px-3 py-2 text-sm outline-none focus:border-primary'
  return (
    <section className="flex flex-col gap-4 rounded-card border border-bd bg-surface p-5">
      <header>
        <h2 className="text-[15px] font-semibold">Ficha de {ativo.nome}</h2>
        <p className="text-xs text-muted">Informações da empresa e o tema padrão das apresentações dela. Salva sozinho.</p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Nome de exibição</span>
          <input type="text" value={ficha.exibicao} onChange={(e) => patch({ exibicao: e.target.value })} placeholder={ativo.nome} className={campo} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">CNPJ</span>
          <input type="text" value={ficha.cnpj} onChange={(e) => patch({ cnpj: e.target.value })} placeholder="00.000.000/0000-00" className={campo} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Responsável</span>
          <input type="text" value={ficha.responsavel} onChange={(e) => patch({ responsavel: e.target.value })} placeholder="Quem aprova/recebe" className={campo} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">E-mail</span>
          <input type="email" value={ficha.email} onChange={(e) => patch({ email: e.target.value })} placeholder="contato@empresa.com.br" className={campo} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Telefone</span>
          <input type="text" value={ficha.telefone} onChange={(e) => patch({ telefone: e.target.value })} placeholder="(83) 9…" className={campo} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Notas internas</span>
          <input type="text" value={ficha.notas} onChange={(e) => patch({ notas: e.target.value })} placeholder="Particularidades, combinados…" className={campo} />
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Tema padrão das apresentações</span>
        <SeletorTema valor={ficha.temaPadrao} onTrocar={(id) => patch({ temaPadrao: id })} rotuloHeranca="AG Clássico" />
      </div>
    </section>
  )
}

export function CadastroPanel() {
  const { clientes, ativo, carregando } = useClientes()
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-[19px] font-semibold">Clientes</h1>
        <p className="text-sm text-muted">
          Cada cliente tem sua própria modelagem (conciliação, DRE/DFC). O cliente ativo é{' '}
          <strong className="text-text">{ativo.nome}</strong> — troque no topo.
        </p>
      </header>

      <FichaEmpresa />

      <FormularioNovo />

      <div className="overflow-hidden rounded-card border border-bd bg-surface">
        <h2 className="border-b border-bd px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {carregando ? 'Carregando…' : `${clientes.length} cliente(s)`}
        </h2>
        <ul>
          {clientes.map((c) => (
            <LinhaCliente key={c.id} cliente={c} ativo={c.id === ativo.id} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function FormularioNovo() {
  const { criar } = useClientes()
  const [nome, setNome] = useState('')
  const [doc, setDoc] = useState('')
  const [erro, setErro] = useState('')

  async function adicionar() {
    if (!nome.trim()) return
    try {
      await criar(nome, doc)
      setNome('')
      setDoc('')
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar')
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-bd bg-surface p-4">
      <p className="text-sm font-semibold">Novo cliente</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome"
          className="flex-1 rounded-lg border border-bd bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          placeholder="CNPJ/CPF (opcional)"
          className="flex-1 rounded-lg border border-bd bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => void adicionar()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-secondary"
        >
          Adicionar
        </button>
      </div>
      {erro ? <p className="text-xs text-danger">{erro}</p> : null}
    </div>
  )
}

function LinhaCliente({ cliente, ativo }: { cliente: Tenant; ativo: boolean }) {
  const [editando, setEditando] = useState(false)
  if (editando) return <LinhaEdicao cliente={cliente} onFechar={() => setEditando(false)} />
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-bd/50 px-4 py-3 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-semibold">
          {cliente.nome}
          {ativo ? <span className="ml-2 rounded bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">ativo</span> : null}
        </p>
        {cliente.documento ? <p className="text-xs text-muted">{cliente.documento}</p> : null}
      </div>
      <Acoes cliente={cliente} ativo={ativo} onEditar={() => setEditando(true)} />
    </li>
  )
}

function Acoes({ cliente, ativo, onEditar }: { cliente: Tenant; ativo: boolean; onEditar: () => void }) {
  const { selecionar, deletar } = useClientes()
  const protegido = cliente.id === ACME_ID
  return (
    <div className="flex items-center gap-2 text-sm">
      {ativo ? null : (
        <button type="button" onClick={() => selecionar(cliente.id)} className="text-secondary hover:underline">
          Selecionar
        </button>
      )}
      <button type="button" onClick={onEditar} className="text-muted hover:text-text">
        Editar
      </button>
      {protegido ? null : (
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `Excluir o cliente "${cliente.nome}"? Conciliação, DRE/DFC e ajustes dele serão perdidos de forma permanente.`,
              )
            )
              void deletar(cliente.id)
          }}
          className="text-muted hover:text-danger"
        >
          Excluir
        </button>
      )}
    </div>
  )
}

function LinhaEdicao({ cliente, onFechar }: { cliente: Tenant; onFechar: () => void }) {
  const { editar } = useClientes()
  const [nome, setNome] = useState(cliente.nome)
  const [doc, setDoc] = useState(cliente.documento ?? '')

  async function salvar() {
    await editar(cliente.id, { nome: nome.trim(), documento: doc.trim() || null })
    onFechar()
  }

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-bd/50 px-4 py-3 last:border-0">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="flex-1 rounded-lg border border-bd bg-bg px-3 py-1.5 text-sm outline-none focus:border-primary"
      />
      <input
        value={doc}
        onChange={(e) => setDoc(e.target.value)}
        placeholder="CNPJ/CPF"
        className="flex-1 rounded-lg border border-bd bg-bg px-3 py-1.5 text-sm outline-none focus:border-primary"
      />
      <button type="button" onClick={() => void salvar()} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-secondary">
        Salvar
      </button>
      <button type="button" onClick={onFechar} className="rounded-lg border border-bd px-3 py-1.5 text-sm text-muted hover:text-text">
        Cancelar
      </button>
    </li>
  )
}
