import type { OmieConfig } from './config.ts'
import { chamarOmie } from './http.ts'
import {
  listarCategoriasResponse,
  listarClientesResponse,
  listarDepartamentosResponse,
  listarLancCCResponse,
  listarMovimentosResponse,
  type ListarCategoriasResponse,
  type ListarClientesResponse,
  type ListarDepartamentosResponse,
  type ListarLancCCResponse,
  type ListarMovimentosResponse,
} from './schema.ts'

interface PaginaCategorias {
  readonly pagina: number
  readonly registros_por_pagina: number
}

export async function listarCategorias(
  config: OmieConfig,
  params: PaginaCategorias,
): Promise<ListarCategoriasResponse> {
  const json = await chamarOmie(config, 'geral/categorias', 'ListarCategorias', params)
  return listarCategoriasResponse.parse(json)
}

interface PaginaMovimentos {
  readonly nPagina: number
  readonly nRegPorPagina: number
}

export async function listarMovimentos(
  config: OmieConfig,
  params: PaginaMovimentos,
): Promise<ListarMovimentosResponse> {
  const json = await chamarOmie(config, 'financas/mf', 'ListarMovimentos', params)
  return listarMovimentosResponse.parse(json)
}

interface PaginaClientes {
  readonly pagina: number
  readonly registros_por_pagina: number
}

export async function listarClientes(
  config: OmieConfig,
  params: PaginaClientes,
): Promise<ListarClientesResponse> {
  const json = await chamarOmie(config, 'geral/clientes', 'ListarClientesResumido', params)
  return listarClientesResponse.parse(json)
}

interface PaginaDepartamentos {
  readonly pagina: number
  readonly registros_por_pagina: number
}

export async function listarDepartamentos(
  config: OmieConfig,
  params: PaginaDepartamentos,
): Promise<ListarDepartamentosResponse> {
  const json = await chamarOmie(config, 'geral/departamentos', 'ListarDepartamentos', params)
  return listarDepartamentosResponse.parse(json)
}

interface PaginaLancCC {
  readonly nPagina: number
  readonly nRegPorPagina: number
}

export async function listarLancCC(
  config: OmieConfig,
  params: PaginaLancCC,
): Promise<ListarLancCCResponse> {
  const json = await chamarOmie(config, 'financas/contacorrentelancamentos', 'ListarLancCC', params)
  return listarLancCCResponse.parse(json)
}
