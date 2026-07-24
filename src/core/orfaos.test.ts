import { describe, expect, it } from 'vitest'
import type { Categoria } from './categoria'
import type { Modelo } from './modelo'
import type { Movimento } from './movimento'
import { orfasDaConciliacao } from './orfaos'

const cat = (codigo: string): Categoria => ({
  codigo,
  descricao: codigo,
  natureza: 'despesa',
  paiCodigo: null,
  agrupadora: false,
  ativa: true,
  entraNoDre: true,
})

const mov = (p: Partial<Movimento>): Movimento =>
  ({
    idTitulo: '1',
    categoria: '2.01',
    valorCentavos: 100,
    campoValor: '',
    data: '01/06/2026',
    natureza: 'P',
    contraparte: '',
    contraparteCodigo: '',
    parcela: '',
    documento: '',
    contaCorrente: '',
    ...p,
  }) as Movimento

const modelo = (contas: Record<string, string>, fornecedores: Record<string, string> = {}, centros: Record<string, string> = {}): Modelo => ({
  contas: { estrutura: [], mapa: contas },
  fornecedores: { estrutura: [], mapa: fornecedores },
  centros: { estrutura: [], mapa: centros },
})

describe('orfasDaConciliacao', () => {
  it('categoria no cadastro OU ainda lançada não é órfã; sumida dos dois é', () => {
    const m = modelo({ '2.01': 'no_a', '2.02': 'no_b', '2.04.89': 'cv_csp' })
    const orfas = orfasDaConciliacao(m, [cat('2.01')], [mov({ categoria: '2.02' })])
    // '2.01' vive no cadastro, '2.02' vive nos movimentos, '2.04.89' morreu (caso real AUTAG 36)
    expect(orfas).toEqual([{ dimensao: 'contas', chave: '2.04.89', noId: 'cv_csp' }])
  })

  it('baldes pseudo (SEM_CATEGORIA / SEM) nunca são órfãos', () => {
    const m = modelo({ SEM_CATEGORIA: 'no_a' }, { SEM: 'forn_x' })
    expect(orfasDaConciliacao(m, [], [])).toEqual([])
  })

  it('fornecedores valida contra a chave de contraparte dos movimentos', () => {
    const m = modelo({}, { '4819913589': 'forn_pj', GUIDX: 'forn_pf' })
    const movs = [mov({ contraparteCodigo: 'GUIDX', contraparte: 'Fulano' })]
    expect(orfasDaConciliacao(m, [], movs)).toEqual([
      { dimensao: 'fornecedores', chave: '4819913589', noId: 'forn_pj' },
    ])
  })

  it('centros valida contra a identidade por movimento (t:/cc:)', () => {
    const m = modelo({}, {}, { 't:9|001': 'dep_1', 'cc:777': 'dep_2' })
    const movs = [mov({ idTitulo: '9', parcela: '001' })]
    expect(orfasDaConciliacao(m, [], movs)).toEqual([
      { dimensao: 'centros', chave: 'cc:777', noId: 'dep_2' },
    ])
  })
})
