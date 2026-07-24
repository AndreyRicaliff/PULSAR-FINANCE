// @vitest-environment jsdom
/**
 * O count-up anima sobre texto FORMATADO. Os dois riscos reais: (1) o "—" do fail-closed
 * (§8.4) virar "0" contando — seria inventar um número que não existe; (2) o valor final
 * não fechar exatamente no texto original por erro de arredondamento.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useContagem } from './useContagem'

afterEach(cleanup)

function Alvo({ texto }: { texto: string }) {
  return <span data-testid="v">{useContagem(texto)}</span>
}

const valor = () => screen.getByTestId('v').textContent

describe('useContagem', () => {
  it('fecha exatamente no texto original (sem erro de arredondamento)', async () => {
    render(<Alvo texto="R$ 1.234.567,89" />)
    await waitFor(() => expect(valor()).toBe('R$ 1.234.567,89'), { timeout: 2000 })
  })

  it('preserva sufixo de porcentagem', async () => {
    render(<Alvo texto="12,5%" />)
    await waitFor(() => expect(valor()).toBe('12,5%'), { timeout: 2000 })
  })

  it('NÃO conta o traço do fail-closed — "—" nunca vira 0', () => {
    render(<Alvo texto="—" />)
    expect(valor()).toBe('—')
  })

  it('texto sem número passa intacto', () => {
    render(<Alvo texto="Sem dados" />)
    expect(valor()).toBe('Sem dados')
  })

  it('negativo mantém o sinal ao fechar', async () => {
    render(<Alvo texto="-R$ 42,00" />)
    await waitFor(() => expect(valor()).toBe('-R$ 42,00'), { timeout: 2000 })
  })
})
