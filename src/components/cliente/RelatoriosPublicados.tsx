/**
 * @file "Meus relatórios": o que a AG PUBLICOU para este cliente.
 *
 * Fechava o meio do caminho que faltava (report 06/08): existia o botão Publicar e a RLS que
 * autoriza o cliente a ler `status='publicada'`, mas nenhuma tela no lado dele — o relatório
 * ficava num lugar que ele não alcançava.
 *
 * Lê o CONGELADO (`numeros`), nunca recalcula: um relatório entregue não pode mudar porque a
 * conciliação mudou depois. Publicada antiga, sem foto, é dita como tal em vez de fingir.
 */
import { useCallback, useEffect, useState } from 'react'
import { lerCongelado, type NumerosCongelados } from '@/core/congelamento'
import { rotuloIntervalo } from '@/core/periodo'
import { useClientes } from '@/lib/clientes'
import { supabase } from '@/lib/supabase'
import { TabelaDemonstracao } from '../TabelaDemonstracao.tsx'

interface Publicada {
  readonly id: string
  readonly titulo: string
  readonly competencia: string
  readonly publicado_em: string | null
  readonly numeros: unknown
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const mesLegivel = (aaaaMm: string) => {
  const [a, m] = aaaaMm.split('-')
  return a && m ? `${MESES[Number(m) - 1] ?? m}/${a.slice(2)}` : aaaaMm
}
const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')

export function RelatoriosPublicados() {
  const { ativo } = useClientes()
  const [itens, setItens] = useState<readonly Publicada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [abertoId, setAbertoId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!supabase) return setCarregando(false)
    // Sem filtro por status: a RLS do cliente já só devolve publicada do tenant dele —
    // repetir a regra aqui criaria uma segunda fonte de verdade para a mesma decisão.
    const { data, error } = await supabase
      .from('painel_apresentacoes')
      .select('id, titulo, competencia, publicado_em, numeros')
      .eq('cliente_id', ativo.id)
      .order('competencia', { ascending: false })
    if (error) setErro(error.message)
    else setItens((data ?? []) as Publicada[])
    setCarregando(false)
  }, [ativo.id])

  useEffect(() => {
    setItens([])
    setAbertoId(null)
    setCarregando(true)
    void carregar()
  }, [carregar])

  if (carregando) return <p className="text-sm text-muted">Carregando seus relatórios…</p>

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold">Meus relatórios</h1>
          <p className="text-sm text-muted">Os fechamentos que a AG Consultoria publicou para você.</p>
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          className="fx-press rounded-lg border border-bd bg-surface2 px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary hover:text-text"
        >
          Procurar novos
        </button>
      </header>

      {erro ? <p className="rounded-card border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{erro}</p> : null}

      {itens.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-10 text-center text-sm text-muted">
          Nenhum relatório publicado ainda. Quando a AG publicar o fechamento do mês, ele aparece aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((p) => (
            <Cartao key={p.id} p={p} aberto={abertoId === p.id} onAlternar={() => setAbertoId(abertoId === p.id ? null : p.id)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Cartao({ p, aberto, onAlternar }: { p: Publicada; aberto: boolean; onAlternar: () => void }) {
  const congelado = lerCongelado(p.numeros)
  return (
    <li className="overflow-hidden rounded-card border border-bd bg-surface">
      <button type="button" onClick={onAlternar} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left hover:bg-surface2/40">
        <span className="flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-sm">{p.titulo}</strong>
          <span className="text-[11px] text-muted">
            Referente a {mesLegivel(p.competencia)} · publicado em {dataBr(p.publicado_em)}
          </span>
        </span>
        <span className="text-xs font-medium text-secondary">{aberto ? 'Fechar' : 'Abrir'}</span>
      </button>
      {aberto ? <Conteudo congelado={congelado} /> : null}
    </li>
  )
}

function Conteudo({ congelado }: { congelado: NumerosCongelados | null }) {
  if (!congelado) {
    return (
      <div className="border-t border-bd px-5 py-4">
        <p className="text-sm text-muted">
          Este relatório foi publicado antes de os números passarem a ser arquivados junto. Peça à AG
          para publicar uma nova versão — assim o conteúdo fica preservado como foi entregue.
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 border-t border-bd px-5 py-4">
      <p className="text-[11px] text-muted">
        Números de {rotuloIntervalo(congelado.intervalo)} · {congelado.movimentos} lançamentos ·{' '}
        <strong className="text-text">arquivados na publicação</strong> — não mudam com o tempo.
      </p>
      <TabelaDemonstracao titulo="Resultado do mês" linhas={congelado.dre} grupos={[]} />
      <TabelaDemonstracao titulo="Entradas e saídas" linhas={congelado.dfc} grupos={[]} />
    </div>
  )
}
