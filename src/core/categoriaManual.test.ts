import { describe, expect, it } from 'vitest'
import type { Categoria } from './categoria'
import { CATEGORIAS_MANUAIS_VAZIO, criarCategoriaManual, ehCategoriaManual, normalizarCategoriasManuais } from './categoriaManual'

const erp = (codigo: string, descricao: string): Categoria => ({
  codigo,
  descricao,
  natureza: 'receita',
  paiCodigo: null,
  agrupadora: false,
  ativa: true,
  entraNoDre: true,
})

describe('criarCategoriaManual', () => {
  it('cria analítica ativa com código man:<id>', () => {
    const r = criarCategoriaManual(CATEGORIAS_MANUAIS_VAZIO, ' Receita Delivery ', 'receita', [], 'abc')
    if ('erro' in r) throw new Error(r.erro)
    expect(r.codigo).toBe('man:abc')
    expect(r.doc.categorias[0]).toMatchObject({ descricao: 'Receita Delivery', natureza: 'receita', agrupadora: false, ativa: true })
    expect(ehCategoriaManual(r.codigo)).toBe(true)
  })
  it('recusa duplicata contra o ERP (sem caixa/acento) apontando o conflito', () => {
    const r = criarCategoriaManual(CATEGORIAS_MANUAIS_VAZIO, 'RECEITA COM VENDAS', 'receita', [erp('1.01', 'Receita com Vendas')], 'x')
    expect('erro' in r && r.erro).toContain('Receita com Vendas')
  })
  it('recusa duplicata contra outra manual', () => {
    const r1 = criarCategoriaManual(CATEGORIAS_MANUAIS_VAZIO, 'Taxas iFood', 'despesa', [], 'a')
    if ('erro' in r1) throw new Error(r1.erro)
    const r2 = criarCategoriaManual(r1.doc, 'taxas ifood', 'despesa', [], 'b')
    expect('erro' in r2 && r2.erro).toContain('criada manualmente')
  })
  it('nome vazio é recusado', () => {
    expect('erro' in criarCategoriaManual(CATEGORIAS_MANUAIS_VAZIO, '   ', 'receita', [], 'x')).toBe(true)
  })
})

describe('normalizarCategoriasManuais', () => {
  it('lixo vira doc vazio e item inválido é filtrado', () => {
    expect(normalizarCategoriasManuais(null)).toEqual(CATEGORIAS_MANUAIS_VAZIO)
    const doc = normalizarCategoriasManuais({
      categorias: [
        { codigo: 'man:ok', descricao: 'Válida', natureza: 'despesa' },
        { codigo: '2.01', descricao: 'Não-manual', natureza: 'despesa' },
        { codigo: 'man:x', descricao: '', natureza: 'despesa' },
      ],
    })
    expect(doc.categorias.map((c) => c.codigo)).toEqual(['man:ok'])
    expect(doc.categorias[0]).toMatchObject({ agrupadora: false, ativa: true, entraNoDre: true })
  })
})
