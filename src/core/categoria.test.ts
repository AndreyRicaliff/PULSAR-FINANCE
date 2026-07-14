import { describe, expect, it } from 'vitest'
import { codigoExibivel, mapaProfundidade, rotuloCategoria, type Categoria } from './categoria'

const GUID = '6f663f31-b8ea-4f2c-a778-cbc1804e7241'

describe('codigoExibivel', () => {
  it('mantém código hierárquico Omie', () => {
    expect(codigoExibivel('2.01.03')).toBe('2.01.03')
    expect(codigoExibivel('1')).toBe('1')
  })

  it('oculta GUID Nibo (chave interna, sem significado humano)', () => {
    expect(codigoExibivel(GUID)).toBe('')
    expect(codigoExibivel(GUID.toUpperCase())).toBe('')
  })
})

describe('rotuloCategoria', () => {
  it('Omie: código + descrição', () => {
    expect(rotuloCategoria('2.01.03', 'Fornecedores')).toBe('2.01.03 Fornecedores')
  })

  it('Nibo: só a descrição', () => {
    expect(rotuloCategoria(GUID, 'Compra de Matéria Prima')).toBe('Compra de Matéria Prima')
  })

  it('sem descrição, cai no código cru (nunca rótulo vazio)', () => {
    expect(rotuloCategoria(GUID, '')).toBe(GUID)
    expect(rotuloCategoria('2.01', '')).toBe('2.01')
  })

  it('descrição igual ao código (fallback de resolvedor) não duplica', () => {
    expect(rotuloCategoria('2.01', '2.01')).toBe('2.01')
  })

  it('aceita separador customizado', () => {
    expect(rotuloCategoria('2.01.03', 'Fornecedores', ' · ')).toBe('2.01.03 · Fornecedores')
  })
})

describe('mapaProfundidade', () => {
  const cat = (codigo: string, paiCodigo: string | null): Categoria => ({
    codigo,
    paiCodigo,
    descricao: codigo,
    natureza: 'despesa',
    agrupadora: false,
    ativa: true,
    entraNoDre: true,
  })

  it('segue a cadeia paiCodigo (funciona para GUID Nibo, sem pontos)', () => {
    const raiz = cat(GUID, null)
    const filho = cat('aaaa1111-b8ea-4f2c-a778-cbc1804e7241', GUID)
    const neto = cat('bbbb2222-b8ea-4f2c-a778-cbc1804e7241', filho.codigo)
    const prof = mapaProfundidade([raiz, filho, neto])
    expect(prof.get(raiz.codigo)).toBe(0)
    expect(prof.get(filho.codigo)).toBe(1)
    expect(prof.get(neto.codigo)).toBe(2)
  })

  it('pai fora do plano vira raiz; ciclo não trava', () => {
    const orfa = cat('2.99', '9.99')
    const a = cat('a', 'b')
    const b = cat('b', 'a')
    const prof = mapaProfundidade([orfa, a, b])
    expect(prof.get('2.99')).toBe(0)
    expect(prof.get('a')).toBeDefined()
    expect(prof.get('b')).toBeDefined()
  })
})
