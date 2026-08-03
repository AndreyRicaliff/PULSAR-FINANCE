import { describe, expect, it } from 'vitest'
import { chaveGrupo, gruposDuplicados, normalizarDuplicatas, suspeitasDoLancamento, type MembroDuplicata } from './duplicatas'
import type { Movimento } from './movimento'

const membro = (codigo: string, nome: string, total = 100_00): MembroDuplicata => ({
  codigo,
  nome,
  totalCentavos: total,
  qtd: 1,
})

const mov = (p: Partial<Movimento>): Movimento => ({
  idTitulo: '1',
  categoria: '2.01',
  valorCentavos: 100_00,
  campoValor: '',
  data: '10/07/2026',
  dataEmissao: '10/07/2026',
  dataRegistro: '',
  dataPrevisao: '',
  dataVencimento: '',
  status: '',
  liquidado: 'S',
  documento: '',
  parcela: '',
  contraparte: '',
  contraparteCodigo: '',
  natureza: 'R',
  grupo: '',
  origem: 'COMP',
  tipoDocumento: '',
  operacao: '',
  contaCorrente: '',
  jurosCentavos: 0,
  multaCentavos: 0,
  descontoCentavos: 0,
  valorPagoCentavos: 100_00,
  valorAbertoCentavos: 0,
  ...p,
})

describe('gruposDuplicados', () => {
  it('agrupa códigos distintos com o mesmo nome normalizado (caixa/acento)', () => {
    const gs = gruposDuplicados([membro('a', 'EMBALAGENS', 300_00), membro('b', 'embalagens'), membro('c', 'Aluguel')])
    expect(gs).toHaveLength(1)
    expect(gs[0]!.nomeComum).toBe('embalagens')
    expect(gs[0]!.membros.map((m) => m.codigo)).toEqual(['a', 'b']) // maior total primeiro
  })
  it('grupo marcado como legítimo (ignorado) some — identidade estável por códigos', () => {
    const ms = [membro('b', 'Motoboys'), membro('a', 'motoboys')]
    expect(gruposDuplicados(ms, new Set([chaveGrupo(['a', 'b'])]))).toEqual([])
  })
  it('nome único não vira grupo', () => {
    expect(gruposDuplicados([membro('a', 'Frete')])).toEqual([])
  })
})

describe('suspeitasDoLancamento', () => {
  const cand = { dataIso: '2026-07-10', valorCentavos: 100_00, natureza: 'R' as const }
  it('manual×manual: mesma data, valor e natureza', () => {
    const s = suspeitasDoLancamento(cand, [mov({ idTitulo: 'manual:x', origem: 'MANUAL' })])
    expect(s).toEqual([{ tipo: 'manual', movimento: expect.objectContaining({ idTitulo: 'manual:x' }) }])
  })
  it('edição não compara consigo mesma', () => {
    const s = suspeitasDoLancamento({ ...cand, ignorarId: 'x' }, [mov({ idTitulo: 'manual:x', origem: 'MANUAL' })])
    expect(s).toEqual([])
  })
  it('manual×ERP: mesmo valor pago e natureza numa janela de ±3 dias', () => {
    const s = suspeitasDoLancamento(cand, [mov({ dataPagamento: '12/07/2026' })])
    expect(s).toEqual([{ tipo: 'erp', movimento: expect.anything() }])
    expect(suspeitasDoLancamento(cand, [mov({ dataPagamento: '20/07/2026' })])).toEqual([])
  })
  it('natureza diferente ou valor diferente não casa', () => {
    expect(suspeitasDoLancamento(cand, [mov({ natureza: 'P' })])).toEqual([])
    expect(suspeitasDoLancamento(cand, [mov({ valorPagoCentavos: 99_99, valorCentavos: 99_99 })])).toEqual([])
  })
})

describe('normalizarDuplicatas', () => {
  it('lixo vira doc vazio', () => {
    expect(normalizarDuplicatas(null)).toEqual({ ignoradas: [] })
    expect(normalizarDuplicatas({ ignoradas: [1, 'ok'] })).toEqual({ ignoradas: ['ok'] })
  })
})
