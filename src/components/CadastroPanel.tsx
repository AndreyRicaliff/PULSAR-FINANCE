/** @file Cadastro de clientes (tenants) da AG: criar, ativar e alternar o cliente do BPO. */
import { useState } from 'react'
import { ACME_ID, type Tenant } from '@/core/tenant'
import { useClientes } from '@/lib/clientes'

export function CadastroPanel() {
  const { clientes, ativo, carregando } = useClientes()
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Clientes</h1>
        <p className="text-sm text-muted">
          Cada cliente tem sua própria modelagem (conciliação, DRE/DFC). O cliente ativo é{' '}
          <strong className="text-text">{ativo.nome}</strong> — troque no topo.
        </p>
      </header>

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
          onClick={() => void deletar(cliente.id)}
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
