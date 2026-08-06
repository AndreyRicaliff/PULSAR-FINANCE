/**
 * @file O congelamento existe para uma promessa feita ao cliente: o relatório entregue não
 * muda depois. Até 06/08 essa promessa estava só no texto do botão — o publish gravava `{}`
 * e o `check` do banco aceitava, porque `{}` não é null. Estes testes protegem a distinção
 * que a UI precisa fazer: publicada COM foto × publicada sem foto (legado).
 */
import { describe, expect, it } from 'vitest'
import { congelar, lerCongelado, VERSAO_CONGELAMENTO } from './congelamento'
import type { LinhaCalc } from './demonstracao'

const linha = (id: string, valor: number): LinhaCalc =>
  ({ id, nome: id, rotulo: id, tipo: 'entrada', valorCentavos: valor, gruposIds: [] }) as unknown as LinhaCalc

const foto = congelar({
  dre: [linha('dre_receita', 500_000)],
  dfc: [linha('dfc_op', 300_000)],
  intervalo: { inicio: '2026-07-01', fim: '2026-07-31' },
  regime: 'competencia',
  movimentos: 42,
  agoraIso: '2026-08-06T12:00:00.000Z',
})

describe('congelar', () => {
  it('carimba versão — publicada antiga continua legível quando o formato mudar', () => {
    expect(foto.versao).toBe(VERSAO_CONGELAMENTO)
  })

  it('preserva as linhas calculadas e o escopo do que foi fotografado', () => {
    expect(foto.dre[0]?.valorCentavos).toBe(500_000)
    expect(foto.movimentos).toBe(42)
    expect(foto.intervalo).toEqual({ inicio: '2026-07-01', fim: '2026-07-31' })
  })
})

describe('lerCongelado', () => {
  it('ida e volta pelo JSON do banco preserva os números', () => {
    const lido = lerCongelado(JSON.parse(JSON.stringify(foto)))
    expect(lido?.dre[0]?.valorCentavos).toBe(500_000)
    expect(lido?.regime).toBe('competencia')
  })

  // O caso que motivou o arquivo: 6 apresentações em prod com `numeros = {}`.
  it('o `{}` legado devolve null — a UI avisa, em vez de mostrar zero como fato', () => {
    expect(lerCongelado({})).toBeNull()
  })

  it('null/lixo não derrubam a tela do cliente', () => {
    expect(lerCongelado(null)).toBeNull()
    expect(lerCongelado('texto')).toBeNull()
    expect(lerCongelado({ versao: 1 })).toBeNull()
  })

  it('regime desconhecido cai em competência em vez de virar undefined no rótulo', () => {
    expect(lerCongelado({ ...foto, regime: 'xpto' })?.regime).toBe('competencia')
  })

  it('campo opcional ausente ganha default — meia-foto ainda é melhor que tela quebrada', () => {
    const lido = lerCongelado({ versao: 1, dre: [], dfc: [] })
    expect(lido).not.toBeNull()
    expect(lido?.movimentos).toBe(0)
    expect(lido?.intervalo).toEqual({ inicio: null, fim: null })
  })
})
