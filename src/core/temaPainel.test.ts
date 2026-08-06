/**
 * @file O risco desta feature não é a cor sair errada — é sair ILEGÍVEL. O tema do cliente
 * é escolhido por gosto de marca, e nada impede um acento escuro virar texto sobre fundo
 * escuro. Estes testes travam o piso: nenhum tema, presente ou futuro, produz rótulo abaixo
 * do mínimo AA no painel.
 */
import { describe, expect, it } from 'vitest'
import { TEMAS_APRESENTACAO } from './temaApresentacao'
import { ajustarParaContraste, contraste, hexParaCanais, varsDoPainel, type Canais } from './temaPainel'

const SURFACE_ESCURO: Canais = [20, 20, 40]
const SURFACE_CLARO: Canais = [253, 252, 255]
const canais = (v: string): Canais => v.split(' ').map(Number) as unknown as Canais

describe('hexParaCanais', () => {
  it('converte a forma longa', () => expect(hexParaCanais('#7048E8')).toEqual([112, 72, 232]))
  it('aceita a forma curta', () => expect(hexParaCanais('#abc')).toEqual([170, 187, 204]))
  it('sem #, também', () => expect(hexParaCanais('F2B100')).toEqual([242, 177, 0]))
  it('lixo devolve null em vez de NaN pintando a tela', () => {
    expect(hexParaCanais('roxo')).toBeNull()
    expect(hexParaCanais('#12')).toBeNull()
  })
})

describe('contraste', () => {
  it('preto sobre branco é o máximo de 21', () => {
    expect(contraste([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0)
  })
  it('cor com ela mesma é 1', () => {
    expect(contraste([50, 50, 50], [50, 50, 50])).toBeCloseTo(1, 5)
  })
})

describe('ajustarParaContraste', () => {
  it('cor que JÁ passa volta intacta — não desbota marca à toa', () => {
    const claro: Canais = [230, 230, 250]
    expect(ajustarParaContraste(claro, SURFACE_ESCURO, 4.5, [255, 255, 255])).toEqual(claro)
  })

  it('acento escuro sobre fundo escuro é clareado até passar', () => {
    const vinho = hexParaCanais('#B4304A')!
    expect(contraste(vinho, SURFACE_ESCURO)).toBeLessThan(4.5)
    const ajustado = ajustarParaContraste(vinho, SURFACE_ESCURO, 4.5, [255, 255, 255])
    expect(contraste(ajustado, SURFACE_ESCURO)).toBeGreaterThanOrEqual(4.5)
  })

  it('preserva o matiz: vermelho ajustado continua o canal R dominante', () => {
    const vinho = hexParaCanais('#B4304A')!
    const [r, g, b] = ajustarParaContraste(vinho, SURFACE_ESCURO, 4.5, [255, 255, 255])
    expect(r).toBeGreaterThan(g)
    expect(r).toBeGreaterThan(b)
  })
})

describe('varsDoPainel', () => {
  it('hex inválido não emite var nenhuma — o painel fica com o tema da casa', () => {
    expect(varsDoPainel({ acento: 'nao-e-cor' } as never, SURFACE_ESCURO)).toEqual({})
  })

  it('primary é o acento CRU — a marca do cliente não é desbotada onde é fundo', () => {
    const vars = varsDoPainel({ acento: '#B4304A' } as never, SURFACE_ESCURO)
    expect(vars['--c-primary']).toBe('180 48 74')
  })

  // A trava que importa: vale para os presets de hoje E para qualquer tema custom criado
  // pelo operador amanhã, nos dois temas do app.
  it.each(TEMAS_APRESENTACAO)('tema "$nome" gera texto legível no escuro e no claro', (tema) => {
    for (const fundo of [SURFACE_ESCURO, SURFACE_CLARO]) {
      const secundaria = canais(varsDoPainel(tema, fundo)['--c-secondary']!)
      expect(contraste(secundaria, fundo)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
