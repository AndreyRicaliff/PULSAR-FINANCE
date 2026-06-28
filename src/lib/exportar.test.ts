import { describe, expect, it } from 'vitest'
import { csvDemonstracao } from './exportar'

describe('csvDemonstracao', () => {
  it('gera CSV com ; e decimal com vírgula (Excel pt-BR)', () => {
    const csv = csvDemonstracao([
      { nome: 'Receita Bruta', valorCentavos: 100_050 },
      { nome: '(–) Deduções', valorCentavos: -2_500 },
    ])
    expect(csv).toBe('Linha;Valor (R$)\r\nReceita Bruta;1000,50\r\n(–) Deduções;-25,00')
  })

  it('escapa nome com ; ou aspas (CSV válido)', () => {
    const csv = csvDemonstracao([{ nome: 'Custos; "extras"', valorCentavos: 0 }])
    expect(csv.split('\r\n')[1]).toBe('"Custos; ""extras""";0,00')
  })
})
