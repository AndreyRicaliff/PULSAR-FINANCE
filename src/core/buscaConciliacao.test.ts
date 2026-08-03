import { describe, expect, it } from 'vitest'
import { filtrarConciliacao } from './buscaConciliacao'
import type { No } from './modelo'

const no = (id: string, nome: string, paiId: string | null = null): No => ({ id, nome, paiId })

const ESTRUTURA: No[] = [no('g1', 'Custos Variáveis'), no('s1', 'Embalagens', 'g1'), no('g2', 'Despesas Fixas')]
const ITENS = [
  { chave: '2.01.03', titulo: 'EMBALAGENS' },
  { chave: '2.01.04', titulo: 'embalagens' },
  { chave: '2.05.01', titulo: 'Aluguel' },
  { chave: '2.09.9', titulo: 'Motoboys' },
]
const MAPA = { '2.05.01': 'g2', '2.09.9': 's1' }

describe('filtrarConciliacao', () => {
  it('vazio devolve tudo (referência intacta)', () => {
    expect(filtrarConciliacao(ITENS, ESTRUTURA, MAPA, '  ')).toBe(ITENS)
  })
  it('casa pelo título sem caixa nem acento — pega as duas duplicatas', () => {
    expect(filtrarConciliacao(ITENS, ESTRUTURA, MAPA, 'EMBALAGENS').map((i) => i.chave)).toEqual(
      expect.arrayContaining(['2.01.03', '2.01.04']),
    )
  })
  it('casa pelo código', () => {
    expect(filtrarConciliacao(ITENS, ESTRUTURA, MAPA, '2.05').map((i) => i.chave)).toEqual(['2.05.01'])
  })
  it('casa pelo nome do grupo de destino — Motoboys aparece ao buscar Embalagens (está no subgrupo)', () => {
    const r = filtrarConciliacao(ITENS, ESTRUTURA, MAPA, 'embalagen').map((i) => i.chave)
    expect(r).toContain('2.09.9')
  })
  it('busca sem casamento devolve vazio', () => {
    expect(filtrarConciliacao(ITENS, ESTRUTURA, MAPA, 'inexistente')).toEqual([])
  })
})
