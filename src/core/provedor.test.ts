import { describe, expect, it } from 'vitest'
import { comProvedor, rotulosProvedor, temOrcamento } from './provedor'

describe('rotulosProvedor', () => {
  it('contrai a preposição pelo gênero do provedor', () => {
    expect(rotulosProvedor('omie').de).toBe('da Omie')
    expect(rotulosProvedor('nibo').de).toBe('do Nibo')
    expect(rotulosProvedor('nibo').em).toBe('no Nibo')
  })

  it('não inventa nome de ERP para cliente sem credencial', () => {
    expect(rotulosProvedor(null).nome).toBe('ERP')
    expect(rotulosProvedor(undefined).de).toBe('do ERP')
    expect(rotulosProvedor('sap').nome).toBe('ERP')
  })
})

describe('comProvedor', () => {
  it('interpola todos os tokens, inclusive repetidos', () => {
    const texto = 'dados {de} · rateio {em} · {provedor} e {provedor}'
    expect(comProvedor(texto, rotulosProvedor('nibo'))).toBe(
      'dados do Nibo · rateio no Nibo · Nibo e Nibo',
    )
  })

  it('deixa texto sem token intacto', () => {
    expect(comProvedor('Plano de Contas', rotulosProvedor('omie'))).toBe('Plano de Contas')
  })
})

describe('temOrcamento', () => {
  it('nega só o provedor que comprovadamente não tem o módulo', () => {
    expect(temOrcamento('omie')).toBe(true)
    expect(temOrcamento('nibo')).toBe(false)
  })

  it('provedor desconhecido não vira afirmação falsa (snapshot antigo)', () => {
    expect(temOrcamento(null)).toBe(true)
    expect(temOrcamento(undefined)).toBe(true)
  })
})
