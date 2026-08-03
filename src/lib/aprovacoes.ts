/**
 * @file Fila de aprovações do tenant ativo em RUNTIME + ações do operador.
 * As transições passam pelo UPDATE simples porque a máquina de estados e a trilha moram
 * em triggers no banco — o app não fabrica evento nenhum; decidir/comentar vão por RPC
 * (o MESMO caminho que o lado do cliente vai usar na fase 3).
 */
import { useCallback, useEffect, useState } from 'react'
import type { Aprovacao, EventoAprovacao, StatusAprovacao, TipoEvento } from '@/core/aprovacao'
import { useClientes } from './clientes'
import { supabase } from './supabase'

export interface NovaConta {
  readonly fornecedor: string
  readonly descricao: string
  readonly valorCentavos: number
  /** ISO 'aaaa-mm-dd'. */
  readonly vencimento: string
  readonly tituloRef?: string
  /** false = compra que só se paga com a mercadoria em mãos (planilha: "MERCADORIA RECEBIDA?"). */
  readonly mercadoriaRecebida?: boolean | null
}

export interface AprovacoesApi {
  readonly aprovacoes: readonly Aprovacao[]
  /** Eventos de todas as contas do tenant, ascendente — a UI agrupa por aprovacaoId. */
  readonly eventos: readonly EventoAprovacao[]
  readonly carregando: boolean
  /** Erro de leitura da fila. Sem isso, falha virava "nada a aprovar" — o dono via
   * "tudo em dia" e podia perder a aprovação de um pagamento real (auditoria 03/08). */
  readonly erro: string | null
  readonly criar: (contas: readonly NovaConta[]) => Promise<void>
  readonly decidir: (id: string, decisao: 'aprovada' | 'reprovada', comentario: string) => Promise<void>
  readonly comentar: (id: string, texto: string) => Promise<void>
  readonly transicao: (id: string, para: StatusAprovacao) => Promise<void>
  readonly transicaoLote: (ids: readonly string[], para: StatusAprovacao) => Promise<void>
  readonly decidirLote: (ids: readonly string[], decisao: 'aprovada' | 'reprovada', comentario: string) => Promise<void>
  readonly marcarMercadoria: (id: string, recebida: boolean) => Promise<void>
  readonly recarregar: () => Promise<void>
}

interface LinhaAprovacao {
  readonly id: string
  readonly cliente_id: string
  readonly titulo_ref: string | null
  readonly fornecedor: string
  readonly descricao: string
  readonly valor_centavos: number
  readonly vencimento: string
  readonly status: StatusAprovacao
  readonly mercadoria_recebida: boolean | null
  readonly decidido_em: string | null
  readonly criado_em: string
}

interface LinhaEvento {
  readonly id: string
  readonly aprovacao_id: string
  readonly autor_rotulo: string
  readonly tipo: TipoEvento
  readonly texto: string
  readonly criado_em: string
}

const mapearAprovacao = (r: LinhaAprovacao): Aprovacao => ({
  id: r.id,
  clienteId: r.cliente_id,
  tituloRef: r.titulo_ref,
  fornecedor: r.fornecedor,
  descricao: r.descricao,
  valorCentavos: Number(r.valor_centavos),
  vencimento: r.vencimento,
  status: r.status,
  mercadoriaRecebida: r.mercadoria_recebida,
  decididoEm: r.decidido_em,
  criadoEm: r.criado_em,
})

const mapearEvento = (r: LinhaEvento): EventoAprovacao => ({
  id: r.id,
  aprovacaoId: r.aprovacao_id,
  autorRotulo: r.autor_rotulo,
  tipo: r.tipo,
  texto: r.texto,
  criadoEm: r.criado_em,
})

function aErro(e: { message: string } | null, contexto: string): void {
  if (e) throw new Error(`${contexto}: ${e.message}`)
}

export function useAprovacoes(): AprovacoesApi {
  const { ativo } = useClientes()
  const [aprovacoes, setAprovacoes] = useState<readonly Aprovacao[]>([])
  const [eventos, setEventos] = useState<readonly EventoAprovacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase) return setCarregando(false)
    const { data, error } = await supabase
      .from('painel_aprovacoes')
      .select('id, cliente_id, titulo_ref, fornecedor, descricao, valor_centavos, vencimento, status, decidido_em, criado_em')
      .eq('cliente_id', ativo.id)
      .order('vencimento', { ascending: true })
    if (error) {
      console.error('[aprovacoes] erro ao carregar:', error.message)
      setErro('Não foi possível carregar as contas aguardando aprovação.')
      return setCarregando(false)
    }
    const linhas = (data as LinhaAprovacao[]).map(mapearAprovacao)
    const ids = linhas.map((a) => a.id)
    let evs: readonly EventoAprovacao[] = []
    if (ids.length) {
      const { data: de, error: ee } = await supabase
        .from('painel_aprovacao_eventos')
        .select('id, aprovacao_id, autor_rotulo, tipo, texto, criado_em')
        .in('aprovacao_id', ids)
        .order('criado_em', { ascending: true })
      if (ee) console.error('[aprovacoes] erro ao carregar trilha:', ee.message)
      else evs = (de as LinhaEvento[]).map(mapearEvento)
    }
    setAprovacoes(linhas)
    setEventos(evs)
    setErro(null)
    setCarregando(false)
  }, [ativo.id])

  // Troca de tenant → zera antes de hidratar (não vaza fila entre clientes).
  useEffect(() => {
    setAprovacoes([])
    setEventos([])
    setErro(null)
    setCarregando(true)
    void recarregar()
  }, [ativo.id, recarregar])

  const criar = useCallback(
    async (contas: readonly NovaConta[]) => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (!contas.length) return
      const { error } = await supabase.from('painel_aprovacoes').insert(
        contas.map((c) => ({
          cliente_id: ativo.id,
          titulo_ref: c.tituloRef ?? null,
          fornecedor: c.fornecedor,
          descricao: c.descricao,
          valor_centavos: c.valorCentavos,
          vencimento: c.vencimento,
          mercadoria_recebida: c.mercadoriaRecebida ?? null,
        })),
      )
      aErro(error, 'Erro ao criar conta(s)')
      await recarregar()
    },
    [ativo.id, recarregar],
  )

  const decidir = useCallback(
    async (id: string, decisao: 'aprovada' | 'reprovada', comentario: string) => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { error } = await supabase.rpc('decidir_aprovacao', {
        p_id: id,
        p_decisao: decisao,
        p_comentario: comentario,
      })
      aErro(error, 'Erro ao registrar decisão')
      await recarregar()
    },
    [recarregar],
  )

  const comentar = useCallback(
    async (id: string, texto: string) => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { error } = await supabase.rpc('comentar_aprovacao', { p_id: id, p_texto: texto })
      aErro(error, 'Erro ao comentar')
      await recarregar()
    },
    [recarregar],
  )

  const transicao = useCallback(
    async (id: string, para: StatusAprovacao) => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { error } = await supabase.from('painel_aprovacoes').update({ status: para }).eq('id', id)
      aErro(error, 'Erro na transição')
      await recarregar()
    },
    [recarregar],
  )

  // Lote: transição é UM update com .in() (o trigger valida linha a linha); decidir vai
  // pelo RPC um a um (as validações de vínculo/estado moram lá) com erros agregados.
  const transicaoLote = useCallback(
    async (ids: readonly string[], para: StatusAprovacao) => {
      if (!supabase || !ids.length) return
      const { error } = await supabase.from('painel_aprovacoes').update({ status: para }).in('id', ids)
      aErro(error, 'Erro na transição em lote')
      await recarregar()
    },
    [recarregar],
  )

  const decidirLote = useCallback(
    async (ids: readonly string[], decisao: 'aprovada' | 'reprovada', comentario: string) => {
      const sb = supabase
      if (!sb || !ids.length) return
      const resultados = await Promise.allSettled(
        ids.map((id) => sb.rpc('decidir_aprovacao', { p_id: id, p_decisao: decisao, p_comentario: comentario })),
      )
      await recarregar()
      const falhas = resultados.filter((r) => r.status === 'rejected' || r.value?.error).length
      if (falhas) throw new Error(`${falhas} de ${ids.length} não foram registradas — recarregue e confira.`)
    },
    [recarregar],
  )

  // Fora do congelamento de propósito: a mercadoria chega DEPOIS da aprovação.
  const marcarMercadoria = useCallback(
    async (id: string, recebida: boolean) => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { error } = await supabase.from('painel_aprovacoes').update({ mercadoria_recebida: recebida }).eq('id', id)
      aErro(error, 'Erro ao marcar mercadoria')
      await recarregar()
    },
    [recarregar],
  )

  return { aprovacoes, eventos, carregando, erro, criar, decidir, comentar, transicao, transicaoLote, decidirLote, marcarMercadoria, recarregar }
}
