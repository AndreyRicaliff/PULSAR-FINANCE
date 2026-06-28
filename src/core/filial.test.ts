import { describe, expect, it } from 'vitest'
import { montarEstruturaCentros, SEM_FILIAL, type Departamento } from './centros'
import { autoPorContraparte, autoPorNome, chaveMovFilial, filialDoMovimento, filtrarPorFilial, resolverFilial, resultadoPorFilial } from './filial'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'

function mov(p: Partial<Movimento>): Movimento {
  return {
    idTitulo: '1', categoria: '1.01', valorCentavos: 100, campoValor: 'valor', data: '',
    dataEmissao: '', dataRegistro: '', dataPrevisao: '', dataVencimento: '', status: '',
    liquidado: '', documento: '', parcela: '', contraparte: '', contraparteCodigo: '', natureza: 'R',
    grupo: '', origem: '', tipoDocumento: '', operacao: '', contaCorrente: '', jurosCentavos: 0,
    multaCentavos: 0, descontoCentavos: 0, valorPagoCentavos: 0, valorAbertoCentavos: 0, ...p,
  }
}

const dep = (codigo: string, descricao: string, estrutura: string, inativo = false): Departamento => ({
  codigo, descricao, estrutura, inativo,
})

const DEPS = [
  dep('1', 'Sua Empresa', '001'),
  dep('2', 'Administrativo', '001.001'),
  dep('3', 'Instalação', '001.003'),
  dep('4', 'Embasa Cotegipe', '001.003.004.001.001'),
  dep('5', 'Inativo', '001.002', true),
]

describe('montarEstruturaCentros', () => {
  const nos = montarEstruturaCentros(DEPS)

  it('nível 001.xxx vira grupo; descendente profundo vira subgrupo do seu 001.xxx', () => {
    expect(nos.find((n) => n.id === 'dep:2')?.paiId).toBeNull()
    expect(nos.find((n) => n.id === 'dep:4')?.paiId).toBe('dep:3')
  })

  it('raiz da empresa e inativos ficam de fora; Sem filial sempre presente', () => {
    expect(nos.some((n) => n.id === 'dep:1')).toBe(false)
    expect(nos.some((n) => n.id === 'dep:5')).toBe(false)
    expect(nos.some((n) => n.id === SEM_FILIAL.id)).toBe(true)
  })
})

const CENTROS: Conciliacao = {
  estrutura: montarEstruturaCentros(DEPS),
  mapa: { 'cc:77': 'dep:4', 'cc:99': 'sem_filial' },
}

describe('chaveMovFilial', () => {
  it('evento de extrato usa o id do lançamento CC', () => {
    expect(chaveMovFilial(mov({ idMovCC: '77', idTitulo: '0' }))).toBe('cc:77')
  })
  it('título usa id estável + parcela', () => {
    expect(chaveMovFilial(mov({ idTitulo: '123', parcela: '001/002' }))).toBe('t:123|001/002')
  })
})

describe('filialDoMovimento', () => {
  it('rateio real da Omie tem precedência sobre a seleção manual', () => {
    expect(filialDoMovimento(mov({ departamento: '3', idMovCC: '77', idTitulo: '0' }), CENTROS)).toBe('dep:3')
  })
  it('sem rateio, vale a seleção manual por movimento', () => {
    expect(filialDoMovimento(mov({ idMovCC: '77', idTitulo: '0' }), CENTROS)).toBe('dep:4')
  })
  it('departamento desconhecido na estrutura não inventa nó', () => {
    expect(filialDoMovimento(mov({ departamento: '999' }), CENTROS)).toBeNull()
  })
})

describe('herança automática por contraparte', () => {
  it('movimento marcado espalha o default para irmãos da mesma contraparte', () => {
    const marcado = mov({ idMovCC: '77', idTitulo: '0', contraparteCodigo: 'forn1' }) // manual → dep:4
    const herdeiro = mov({ idTitulo: '500', contraparteCodigo: 'forn1' }) // sem atribuição → herda
    const auto = autoPorContraparte([marcado, herdeiro], CENTROS)
    expect(auto.get('forn1')).toBe('dep:4')
    expect(resolverFilial(herdeiro, CENTROS, auto)).toEqual({ noId: 'dep:4', origem: 'auto' })
  })

  it('sem_filial explícito não propaga para os irmãos', () => {
    const movs = [mov({ idMovCC: '99', idTitulo: '0', contraparteCodigo: 'forn2' })]
    expect(autoPorContraparte(movs, CENTROS).has('forn2')).toBe(false)
  })

  it('herdada entra no agregado por filial', () => {
    const movs = [
      mov({ idMovCC: '77', idTitulo: '0', contraparteCodigo: 'forn1', natureza: 'P', valorCentavos: 100 }),
      mov({ idTitulo: '500', contraparteCodigo: 'forn1', natureza: 'P', valorCentavos: 900 }),
    ]
    const r = resultadoPorFilial(movs, CENTROS)
    expect(r.linhas[0]).toMatchObject({ noId: 'dep:4', saidasCentavos: 1000, qtd: 2 })
    expect(r.semFilial.qtd).toBe(0)
  })
})

describe('autoPorNome', () => {
  const nomes = new Map([
    ['c1', 'EMBASA'], // não existe filial 'Embasa' em DEPS — só 'Embasa Cotegipe'
    ['c2', 'MMC ENGENHARIA'],
    ['c3', 'Embasa Cotegipe LTDA'],
  ])

  it('nome idêntico ou prefixo exato casa; conter a palavra não basta', () => {
    const auto = autoPorNome(nomes, CENTROS)
    expect(auto.get('c3')).toBe('dep:4') // 'embasa cotegipe ltda' começa com 'embasa cotegipe '
    expect(auto.has('c2')).toBe(false) // contém 'engenharia' mas não é a filial
    expect(auto.has('c1')).toBe(false) // 'embasa' sozinho não é nenhuma filial de DEPS
  })
})

describe('resultadoPorFilial', () => {
  it('separa entradas e saídas por filial e isola o sem-filial', () => {
    const movs = [
      mov({ idMovCC: '77', idTitulo: '0', natureza: 'R', valorCentavos: 1000 }),
      mov({ idMovCC: '77', idTitulo: '0', natureza: 'P', valorCentavos: 400 }),
      mov({ idTitulo: '555', natureza: 'P', valorCentavos: 50 }), // sem atribuição nem contraparte
      mov({ idMovCC: '99', idTitulo: '0', natureza: 'R', valorCentavos: 7 }), // marcada sem_filial
    ]
    const r = resultadoPorFilial(movs, CENTROS)
    expect(r.linhas).toHaveLength(1)
    expect(r.linhas[0]).toMatchObject({ noId: 'dep:4', entradasCentavos: 1000, saidasCentavos: 400, resultadoCentavos: 600, qtd: 2 })
    expect(r.semFilial).toMatchObject({ entradasCentavos: 7, saidasCentavos: 50, qtd: 2 })
  })
})

describe('filtrarPorFilial', () => {
  const movs = [
    mov({ idMovCC: '77', idTitulo: '0', valorCentavos: 10 }), // manual → dep:4
    mov({ departamento: '3', valorCentavos: 20 }), // omie → dep:3
    mov({ idTitulo: '999', valorCentavos: 30 }), // sem filial
  ]
  const auto = new Map<string, string>()

  it('null passa tudo (sem custo fora do filtro)', () => {
    expect(filtrarPorFilial(movs, null, CENTROS, auto).dentro).toHaveLength(3)
  })
  it('filtra pela filial resolvida e conta os excluídos', () => {
    const r = filtrarPorFilial(movs, 'dep:4', CENTROS, auto)
    expect(r.dentro.map((m) => m.valorCentavos)).toEqual([10])
    expect(r.fora).toBe(2)
  })
  it("'sem_filial' devolve só o não-atribuído", () => {
    const r = filtrarPorFilial(movs, 'sem_filial', CENTROS, auto)
    expect(r.dentro.map((m) => m.valorCentavos)).toEqual([30])
  })
})
