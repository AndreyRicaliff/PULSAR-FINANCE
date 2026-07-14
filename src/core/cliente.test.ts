import { describe, expect, it } from 'vitest'
import { codigoContraparte, nomeContraparte, type ClienteInfo } from './cliente'

const GUID_NULO = '00000000-0000-0000-0000-000000000000'
const GUID_REAL = '6f663f31-b8ea-4f2c-a778-cbc1804e7241'

const CLIENTES: Readonly<Record<string, ClienteInfo>> = {
  '4570157862': { nome: 'ACME LTDA', doc: '14.309.992/0001-48' },
  [GUID_REAL]: { nome: 'Fornecedor Nibo', doc: '' },
}

describe('codigoContraparte', () => {
  it('GUID nulo Nibo (lançamento sem stakeholder) vira ausência', () => {
    expect(codigoContraparte(GUID_NULO)).toBe('')
  })

  it('mantém código Omie, GUID real e vazio', () => {
    expect(codigoContraparte('4570157862')).toBe('4570157862')
    expect(codigoContraparte(GUID_REAL)).toBe(GUID_REAL)
    expect(codigoContraparte('')).toBe('')
  })
})

describe('nomeContraparte', () => {
  it('resolve pelo cadastro (código Omie e GUID Nibo)', () => {
    expect(nomeContraparte('4570157862', CLIENTES)).toBe('ACME LTDA')
    expect(nomeContraparte(GUID_REAL, CLIENTES)).toBe('Fornecedor Nibo')
  })

  it('ausente/SEM/GUID nulo → Sem contraparte', () => {
    expect(nomeContraparte('', CLIENTES)).toBe('Sem contraparte')
    expect(nomeContraparte('SEM', CLIENTES)).toBe('Sem contraparte')
    expect(nomeContraparte(GUID_NULO, CLIENTES)).toBe('Sem contraparte')
  })

  it('código numérico sem cadastro ganha marcador; nome cru volta como está', () => {
    expect(nomeContraparte('999', CLIENTES)).toBe('Código 999')
    expect(nomeContraparte('POSTO CENTRAL', CLIENTES)).toBe('POSTO CENTRAL')
  })
})
