/**
 * @file Vistas internas do MenuContexto: renomear item (override Omie), renomear nó da
 * estrutura e a lista "Conciliar/Mover em…" com filtro. Separadas do menu para manter
 * cada arquivo pequeno e cada vista com uma responsabilidade.
 */
import { useState } from 'react'
import { useOverrides } from '@/lib/overrides'
import type { Opcao } from './util'

export function FormRenomeItem({
  entidade,
  codigo,
  onFechar,
}: {
  entidade: 'categoria' | 'contraparte'
  codigo: string
  onFechar: () => void
}) {
  const { resolvedor, renomear, restaurar } = useOverrides()
  const resolvido = entidade === 'categoria' ? resolvedor.categoria(codigo) : resolvedor.contraparte(codigo)
  const [valor, setValor] = useState(resolvido.nome)

  const salvar = () => {
    renomear(entidade, codigo, valor)
    onFechar()
  }

  return (
    <div className="p-3">
      <p className="mb-1 text-xs uppercase tracking-wide text-muted">
        Renomear {entidade === 'categoria' ? 'categoria' : 'fornecedor'}
      </p>
      {resolvido.editado ? <p className="mb-2 text-[11px] text-muted">Original Omie: {resolvido.original}</p> : null}
      <CampoNome valor={valor} onValor={setValor} onSalvar={salvar} onFechar={onFechar} />
      <div className="mt-2 flex items-center gap-2">
        <BotaoSalvar onClick={salvar} />
        {resolvido.editado ? (
          <button
            type="button"
            onClick={() => {
              restaurar(entidade, codigo)
              onFechar()
            }}
            className="rounded border border-bd px-3 py-1 text-xs text-muted hover:text-text"
          >
            Restaurar original
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function FormRenomeNo({
  nomeAtual,
  onSalvar,
  onFechar,
}: {
  nomeAtual: string
  onSalvar: (nome: string) => void
  onFechar: () => void
}) {
  const [valor, setValor] = useState(nomeAtual)
  const salvar = () => {
    onSalvar(valor)
    onFechar()
  }
  return (
    <div className="p-3">
      <p className="mb-1 text-xs uppercase tracking-wide text-muted">Renomear grupo</p>
      <CampoNome valor={valor} onValor={setValor} onSalvar={salvar} onFechar={onFechar} />
      <div className="mt-2">
        <BotaoSalvar onClick={salvar} />
      </div>
    </div>
  )
}

/** Lista de destinos (grupo → subgrupo) com filtro — vista "Conciliar/Mover em…". */
export function ListaMover({
  opcoes,
  onEscolher,
}: {
  opcoes: readonly Opcao[]
  onEscolher: (noId: string) => void
}) {
  const [busca, setBusca] = useState('')
  const q = busca.trim().toLowerCase()
  const visiveis = q ? opcoes.filter((o) => o.rotulo.toLowerCase().includes(q)) : opcoes
  return (
    <div className="flex max-h-72 flex-col">
      <div className="p-2">
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar grupos…"
          className="w-full rounded border border-bd bg-surface2 px-2 py-1 text-xs outline-none focus:border-primary"
        />
      </div>
      <div className="overflow-y-auto pb-1">
        {visiveis.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onEscolher(o.id)}
            className="block w-full whitespace-pre px-3 py-1.5 text-left text-xs hover:bg-surface2"
          >
            {o.rotulo}
          </button>
        ))}
        {visiveis.length === 0 ? <p className="px-3 py-2 text-xs text-muted">Nenhum grupo encontrado</p> : null}
      </div>
    </div>
  )
}

function CampoNome({
  valor,
  onValor,
  onSalvar,
  onFechar,
}: {
  valor: string
  onValor: (v: string) => void
  onSalvar: () => void
  onFechar: () => void
}) {
  return (
    <input
      autoFocus
      value={valor}
      onChange={(e) => onValor(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSalvar()
        if (e.key === 'Escape') onFechar()
      }}
      className="w-full rounded border border-primary bg-surface2 px-2 py-1 text-sm outline-none"
    />
  )
}

function BotaoSalvar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-secondary"
    >
      Salvar
    </button>
  )
}
