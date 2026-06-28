import { z } from 'zod'

// passthrough: a Omie tem dezenas de campos por categoria; validamos só os que o
// modelo consome e deixamos o resto passar.
export const omieCategoria = z
  .object({
    codigo: z.string(),
    descricao: z.string(),
    categoria_superior: z.string().optional(),
    conta_receita: z.string().optional(),
    conta_despesa: z.string().optional(),
    transferencia: z.string().optional(),
    totalizadora: z.string().optional(),
    conta_inativa: z.string().optional(),
    nao_exibir: z.string().optional(),
  })
  .passthrough()

export type OmieCategoria = z.infer<typeof omieCategoria>

export const listarCategoriasResponse = z.object({
  pagina: z.number(),
  total_de_paginas: z.number(),
  total_de_registros: z.number(),
  categoria_cadastro: z.array(omieCategoria),
})

export type ListarCategoriasResponse = z.infer<typeof listarCategoriasResponse>

// Movimento financeiro (financas/mf). Estrutura varia (detalhes/cabecalho/diversos);
// validamos só o envelope de paginação e deixamos cada movimento passar para extração.
export const listarMovimentosResponse = z
  .object({
    nPagina: z.number().optional(),
    nTotPaginas: z.number().optional(),
    nTotRegistros: z.number().optional(),
    movimentos: z.array(z.record(z.unknown())).default([]),
  })
  .passthrough()

export type ListarMovimentosResponse = z.infer<typeof listarMovimentosResponse>
export type OmieMovimento = Record<string, unknown>

// Cadastro de clientes/fornecedores (geral/clientes ListarClientesResumido).
export const omieCliente = z
  .object({
    codigo_cliente: z.number(),
    razao_social: z.string().optional(),
    nome_fantasia: z.string().optional(),
    cnpj_cpf: z.string().optional(),
  })
  .passthrough()

export type OmieCliente = z.infer<typeof omieCliente>

export const listarClientesResponse = z
  .object({
    pagina: z.number().optional(),
    total_de_paginas: z.number().optional(),
    clientes_cadastro_resumido: z.array(omieCliente).default([]),
  })
  .passthrough()

export type ListarClientesResponse = z.infer<typeof listarClientesResponse>

const omieFault = z.object({ faultstring: z.string(), faultcode: z.string().optional() })
export type OmieFault = z.infer<typeof omieFault>

export function isOmieFault(json: unknown): json is OmieFault {
  return omieFault.safeParse(json).success
}

// Cadastro de departamentos (centros de custo) — geral/departamentos ListarDepartamentos.
export const omieDepartamento = z
  .object({
    codigo: z.string(),
    descricao: z.string(),
    estrutura: z.string().optional(),
    inativo: z.string().optional(),
  })
  .passthrough()

export type OmieDepartamento = z.infer<typeof omieDepartamento>

export const listarDepartamentosResponse = z
  .object({
    pagina: z.number().optional(),
    total_de_paginas: z.number().optional(),
    departamentos: z.array(omieDepartamento).default([]),
  })
  .passthrough()

export type ListarDepartamentosResponse = z.infer<typeof listarDepartamentosResponse>

// Lançamentos de conta corrente (financas/contacorrentelancamentos ListarLancCC) —
// única fonte onde o rateio por departamento dos eventos de extrato aparece.
export const listarLancCCResponse = z
  .object({
    nPagina: z.number().optional(),
    nTotPaginas: z.number().optional(),
    listaLancamentos: z.array(z.record(z.unknown())).default([]),
  })
  .passthrough()

export type ListarLancCCResponse = z.infer<typeof listarLancCCResponse>
