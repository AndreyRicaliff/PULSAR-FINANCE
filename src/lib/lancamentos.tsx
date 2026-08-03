/**
 * @file Lançamentos manuais em RUNTIME: linhas de painel_lancamentos_manuais do tenant
 * ativo + CRUD do operador. A conversão para `Movimento` acontece aqui (uma vez, memoizada)
 * e o MovimentosProvider concatena — todo o resto do app consome sem saber a fonte.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { movimentoDeLancamento, type LancamentoManual, type NaturezaManual } from '@/core/lancamento'
import type { Movimento } from '@/core/movimento'
import { aplicarPisoDados } from '@/core/periodo'
import { pisoDadosDoCliente } from '@/core/tenant'
import { useClientes } from './clientes'
import { supabase } from './supabase'

export interface NovoLancamento {
  readonly data: string
  readonly descricao: string
  readonly valorCentavos: number
  readonly natureza: NaturezaManual
  readonly categoria: string
  readonly origem: string
  readonly observacao: string
}

export interface LancamentosApi {
  readonly lancamentos: readonly LancamentoManual[]
  /** Já convertidos ao canônico e com o piso de dados do tenant aplicado. */
  readonly movimentosManuais: readonly Movimento[]
  readonly carregando: boolean
  /** Falha de LEITURA — a lista pode estar incompleta; a UI avisa (nunca vazio silencioso). */
  readonly erro: string | null
  readonly criar: (novo: NovoLancamento) => Promise<void>
  readonly atualizar: (id: string, mudancas: Partial<NovoLancamento>) => Promise<void>
  /** Soft-delete — a tabela não tem DELETE nem por policy nem por grant. */
  readonly remover: (id: string) => Promise<void>
  readonly recarregar: () => Promise<void>
}

const Ctx = createContext<LancamentosApi | null>(null)

interface Linha {
  readonly id: string
  readonly cliente_id: string
  readonly data: string
  readonly descricao: string
  readonly valor_centavos: number
  readonly natureza: NaturezaManual
  readonly categoria: string
  readonly origem: string
  readonly observacao: string
}

const mapear = (r: Linha): LancamentoManual => ({
  id: r.id,
  clienteId: r.cliente_id,
  data: r.data,
  descricao: r.descricao,
  // bigint chega como number do PostgREST dentro da faixa segura; lançamento manual
  // jamais chega perto de 2^53 centavos.
  valorCentavos: Number(r.valor_centavos),
  natureza: r.natureza,
  categoria: r.categoria,
  origem: r.origem,
  observacao: r.observacao,
})

function aErro(e: { message: string } | null, contexto: string): void {
  if (e) throw new Error(`${contexto}: ${e.message}`)
}

export function LancamentosProvider({ children }: { children: ReactNode }) {
  const { ativo } = useClientes()
  const [lancamentos, setLancamentos] = useState<readonly LancamentoManual[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase) return setCarregando(false)
    const { data, error } = await supabase
      .from('painel_lancamentos_manuais')
      .select('id, cliente_id, data, descricao, valor_centavos, natureza, categoria, origem, observacao')
      .eq('cliente_id', ativo.id)
      .is('removido_em', null)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })
    // Falha de leitura NÃO pode virar lista vazia silenciosa (revisão 03/08): lista []
    // com cara de "sem lançamentos" subtrai receita do resultado sem ninguém perceber.
    if (error) {
      console.error('[lancamentos] erro ao carregar:', error.message)
      setErro(`Não foi possível carregar os lançamentos manuais (${error.message}) — os totais podem estar incompletos.`)
    } else {
      setErro(null)
      setLancamentos((data as Linha[]).map(mapear))
    }
    setCarregando(false)
  }, [ativo.id])

  // Troca de tenant → zera antes de hidratar (não vaza lançamento entre clientes).
  useEffect(() => {
    setLancamentos([])
    setCarregando(true)
    setErro(null)
    void recarregar()
  }, [ativo.id, recarregar])

  const criar = useCallback(
    async (novo: NovoLancamento) => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { error } = await supabase.from('painel_lancamentos_manuais').insert({
        cliente_id: ativo.id,
        data: novo.data,
        descricao: novo.descricao,
        valor_centavos: novo.valorCentavos,
        natureza: novo.natureza,
        categoria: novo.categoria,
        origem: novo.origem,
        observacao: novo.observacao,
      })
      aErro(error, 'Erro ao criar lançamento')
      await recarregar()
    },
    [ativo.id, recarregar],
  )

  const atualizar = useCallback(
    async (id: string, m: Partial<NovoLancamento>) => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { error } = await supabase
        .from('painel_lancamentos_manuais')
        .update({
          ...(m.data !== undefined && { data: m.data }),
          ...(m.descricao !== undefined && { descricao: m.descricao }),
          ...(m.valorCentavos !== undefined && { valor_centavos: m.valorCentavos }),
          ...(m.natureza !== undefined && { natureza: m.natureza }),
          ...(m.categoria !== undefined && { categoria: m.categoria }),
          ...(m.origem !== undefined && { origem: m.origem }),
          ...(m.observacao !== undefined && { observacao: m.observacao }),
        })
        .eq('id', id)
      aErro(error, 'Erro ao salvar lançamento')
      await recarregar()
    },
    [recarregar],
  )

  const remover = useCallback(
    async (id: string) => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { error } = await supabase
        .from('painel_lancamentos_manuais')
        .update({ removido_em: new Date().toISOString() })
        .eq('id', id)
      aErro(error, 'Erro ao remover lançamento')
      await recarregar()
    },
    [recarregar],
  )

  const movimentosManuais = useMemo(
    () => aplicarPisoDados(lancamentos.map(movimentoDeLancamento), pisoDadosDoCliente(ativo.id)),
    [lancamentos, ativo.id],
  )

  const valor = useMemo(
    () => ({ lancamentos, movimentosManuais, carregando, erro, criar, atualizar, remover, recarregar }),
    [lancamentos, movimentosManuais, carregando, erro, criar, atualizar, remover, recarregar],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useLancamentos(): LancamentosApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLancamentos fora de LancamentosProvider')
  return ctx
}
