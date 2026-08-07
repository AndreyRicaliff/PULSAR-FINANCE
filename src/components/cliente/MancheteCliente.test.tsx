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
// Fonte da linha de caixa (decisão 07/08: resultado + caixa empilhados). Vazio por padrão —
// a maioria dos casos testa a manchete sem rodapé.
const caixa = vi.hoisted(() => ({ movimentos: [] as unknown[], saldos: {} as Record<string, number> }))
vi.mock('@/lib/useResultado', () => ({ useResultado: () => ({ serieContinua: serie.atual }) }))
vi.mock('@/lib/movimentos', () => ({ useMovimentos: () => ({ movimentos: caixa.movimentos }) }))
vi.mock('@/lib/useSaldosIniciais', () => ({ useSaldosIniciais: () => ({ saldos: caixa.saldos }) }))
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

afterEach(() => {
  cleanup()
  caixa.movimentos = []
  caixa.saldos = {}
})

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

  it('linha de caixa: aparece como rodapé com a cobertura e o carimbo de sincronização', () => {
    serie.atual = [ponto('2026-06', 200_000, 100_000), ponto('2026-07', 300_000, 150_000)]
    caixa.saldos = { '2026-08': 90_000 }
    caixa.movimentos = [
      { natureza: 'P', valorAbertoCentavos: 40_000, dataVencimento: '20/08/2026', valorPagoCentavos: 0 },
      { natureza: 'P', valorAbertoCentavos: 80_000, dataVencimento: '02/09/2026', valorPagoCentavos: 0 },
    ]
    render(<MancheteCliente sincronizadoEm="2026-08-15T09:30:00.000Z" />)
    expect(screen.getByText('O caixa de hoje cobre as contas até 20 de agosto.')).toBeTruthy()
    expect(screen.getByText(/sincronizado em 15\/08/)).toBeTruthy()
  })

  it('sem saldo informado, o rodapé NÃO promete cobertura', () => {
    serie.atual = [ponto('2026-06', 200_000, 100_000), ponto('2026-07', 300_000, 150_000)]
    caixa.movimentos = [{ natureza: 'P', valorAbertoCentavos: 40_000, dataVencimento: '20/08/2026', valorPagoCentavos: 0 }]
    render(<MancheteCliente />)
    expect(screen.getByText(/cobertura aparece quando o saldo do mês estiver informado/)).toBeTruthy()
    expect(screen.queryByText(/caixa de hoje cobre/)).toBeNull()
  })

  it('sem dado nenhum de caixa, o rodapé simplesmente não existe', () => {
    serie.atual = [ponto('2026-06', 200_000, 100_000), ponto('2026-07', 300_000, 150_000)]
    const { container } = render(<MancheteCliente />)
    expect(container.textContent).not.toMatch(/a pagar|caixa/i)
  })
})
