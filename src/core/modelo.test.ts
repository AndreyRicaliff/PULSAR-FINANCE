import { describe, expect, it } from 'vitest'
import { reordenarRaiz } from './modelo'
import type { No } from './modelo'

const estrutura: No[] = [
  { id: 'a', nome: '1. Receita', paiId: null },
  { id: 'b', nome: '2. Custos', paiId: null },
  { id: 'c', nome: '3. Despesas', paiId: null },
  { id: 'sub', nome: 'Vendas', paiId: 'a' },
]

const raizNomes = (e: No[]) => e.filter((n) => !n.paiId).map((n) => n.nome)

describe('reordenarRaiz (número = posição)', () => {
  it('move para a posição e renumera os nomes pela nova ordem', () => {
    const r = reordenarRaiz(estrutura, 'c', 0) // Despesas para 1ª posição
    expect(raizNomes(r)).toEqual(['1. Despesas', '2. Receita', '3. Custos'])
  })

  it('preserva os filhos (paiId intacto)', () => {
    const r = reordenarRaiz(estrutura, 'b', 0)
    expect(r.find((n) => n.id === 'sub')).toEqual({ id: 'sub', nome: 'Vendas', paiId: 'a' })
  })

  it('id inexistente não altera a estrutura', () => {
    expect(reordenarRaiz(estrutura, 'x', 0)).toEqual(estrutura)
  })
})
