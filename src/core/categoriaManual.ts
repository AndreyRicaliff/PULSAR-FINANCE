/**
 * @file Categorias MANUAIS do painel (pedido 03/08): conta criada pela equipe sem existir
 * no ERP — vive num doc por tenant (nunca é sobrescrita pelo sync, que só troca o espelho
 * cadastros-raw) e entra MERGEADA no cadastro: aparece no lançamento manual, no Plano de
 * Contas e na Matriz (após ter movimento), conciliável em grupo como qualquer categoria.
 * Código `man:<uuid>` — nunca colide com Omie (hierárquico) nem Nibo (GUID cru).
 */
import type { Categoria, Natureza } from './categoria'
import { normalizarTexto } from './texto'

export const PREFIXO_MANUAL = 'man:'

export const ehCategoriaManual = (codigo: string): boolean => codigo.startsWith(PREFIXO_MANUAL)

export interface DocCategoriasManuais {
  readonly categorias: readonly Categoria[]
}

export const CATEGORIAS_MANUAIS_VAZIO: DocCategoriasManuais = { categorias: [] }

const NATUREZAS: readonly Natureza[] = ['receita', 'despesa', 'transferencia', 'outra']

export function normalizarCategoriasManuais(bruto: unknown): DocCategoriasManuais {
  const d = (bruto ?? {}) as Partial<DocCategoriasManuais>
  if (!Array.isArray(d.categorias)) return CATEGORIAS_MANUAIS_VAZIO
  return {
    categorias: d.categorias
      .filter(
        (c): c is Categoria =>
          !!c &&
          typeof c.codigo === 'string' &&
          c.codigo.startsWith(PREFIXO_MANUAL) &&
          typeof c.descricao === 'string' &&
          c.descricao.trim() !== '' &&
          NATUREZAS.includes(c.natureza as Natureza),
      )
      .map((c) => ({ ...c, paiCodigo: null, agrupadora: false, ativa: c.ativa !== false, entraNoDre: true })),
  }
}

export type ResultadoCriacao = { readonly doc: DocCategoriasManuais; readonly codigo: string } | { readonly erro: string }

/**
 * Cria uma categoria manual — com prevenção de duplicata NA ORIGEM: nome que já existe
 * (no ERP ou nas manuais, sem caixa/acento) é recusado apontando o conflito, em vez de
 * nascer o "embalagens × EMBALAGENS" que o sistema de duplicatas caça depois.
 */
export function criarCategoriaManual(
  doc: DocCategoriasManuais,
  descricao: string,
  natureza: Natureza,
  existentes: readonly Categoria[],
  id: string,
): ResultadoCriacao {
  const nome = descricao.trim()
  if (!nome) return { erro: 'Dê um nome à categoria.' }
  const chave = normalizarTexto(nome)
  const conflito = [...existentes, ...doc.categorias].find((c) => normalizarTexto(c.descricao) === chave)
  if (conflito) {
    const origem = ehCategoriaManual(conflito.codigo) ? 'criada manualmente' : 'do ERP'
    return { erro: `Já existe "${conflito.descricao}" (${origem}) — use a existente ou escolha outro nome.` }
  }
  const codigo = `${PREFIXO_MANUAL}${id}`
  const nova: Categoria = {
    codigo,
    descricao: nome,
    natureza,
    paiCodigo: null,
    agrupadora: false,
    ativa: true,
    entraNoDre: true,
  }
  return { doc: { categorias: [...doc.categorias, nova] }, codigo }
}
