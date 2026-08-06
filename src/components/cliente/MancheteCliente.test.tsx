// @vitest-environment jsdom
/**
 * A manchete é a primeira coisa que o cliente lê. O núcleo já é testado em core/manchete;
 * aqui o que se prova é a RENDERIZAÇÃO: que o número aparece formatado em pt-BR, que o
 * negativo mostra o sinal (e não um valor positivo travestido), e que sem mês fechado a
 * tela explica em vez de mostrar zero.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PontoSerie } from '@/core/serie'

const serie = vi.hoisted(() => ({ atual: [] as PontoSerie[] }))
vi.mock('@/lib/useResultado', () => ({ useResultado: () => ({ serieContinua: serie.atual }) }))
// Data fixa: a manchete descarta o mês corrente, então o teste não pode depender de "hoje".
vi.mock('@/core/periodo', async (orig) => ({
  ...(await orig<typeof import('@/core/periodo')>()),
  hojeLocalIso: () => '2026-08-15',
}))

const { MancheteCliente } = await import('./MancheteCliente')

const ponto = (mes: string, entrada: number, saida: number): PontoSerie => ({
  mes,
  rotulo: mes.slice(5),
  entrada,
  saida,
  saldo: entrada - saida,
  projetado: false,
})

afterEach(cleanup)

/**
 * `toLocaleString('pt-BR', {currency})` separa com espaço NÃO-QUEBRÁVEL, e o valor mora em
 * dois nós de texto (o sinal é irmão do número). Normalizar os dois é o que faz o teste
 * medir o que o usuário LÊ, em vez de como o DOM foi montado.
 */
const leitura = (el: Element | null): string => (el?.textContent ?? '').replace(/ /g, ' ')

describe('MancheteCliente', () => {
  it('mês positivo: frase, valor em pt-BR e as duas âncoras', async () => {
    serie.atual = [ponto('2026-06', 200_000, 100_000), ponto('2026-07', 300_000, 150_000)]
    const { container } = render(<MancheteCliente />)
    expect(screen.getByText(/Em julho de 2026, sobrou 50% a mais que em junho\./)).toBeTruthy()
    // count-up: o valor final fecha no texto exato depois da animação.
    await waitFor(() => expect(leitura(container.querySelector('strong'))).toBe('R$ 1.500,00'))
    expect(screen.getByText('Entrou')).toBeTruthy()
    expect(screen.getByText('Saiu')).toBeTruthy()
  })

  it('mês negativo mostra o sinal — prejuízo não pode parecer lucro', async () => {
    serie.atual = [ponto('2026-06', 200_000, 100_000), ponto('2026-07', 100_000, 250_000)]
    const { container } = render(<MancheteCliente />)
    expect(screen.getByText(/faltou/)).toBeTruthy()
    await waitFor(() => expect(leitura(container.querySelector('strong'))).toBe('-R$ 1.500,00'))
  })

  it('sem mês fechado explica, em vez de mostrar zero', () => {
    serie.atual = [ponto('2026-08', 100_000, 50_000)]
    render(<MancheteCliente />)
    expect(screen.getByText(/assim que o primeiro mês fechar/)).toBeTruthy()
    expect(screen.queryByText(/R\$ 0,00/)).toBeNull()
  })

  it('não vaza jargão de contador para a tela do cliente', () => {
    serie.atual = [ponto('2026-06', 200_000, 100_000), ponto('2026-07', 300_000, 150_000)]
    const { container } = render(<MancheteCliente />)
    expect(container.textContent).not.toMatch(/compet[êe]ncia|regime|DRE|DFC|conciliad/i)
  })
})
