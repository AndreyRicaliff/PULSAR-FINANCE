import { describe, expect, it } from 'vitest'
import { codigoExibivel, rotuloCategoria } from './categoria'

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
})
