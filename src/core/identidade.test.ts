/**
 * @file Identidade canônica do movimento + as duas minas que ela desarma (07/08/2026):
 * o merge que colapsaria 68.696 eventos de extrato numa entrada, e a chave persistida de
 * filial que NÃO pode mudar de formato (está gravada nos mapas de centros dos tenants).
 */
import { describe, expect, it } from 'vitest'
import { chaveMovFilial } from './filial'
import { chaveMovimento, type Movimento } from './movimento'
import { origemDo, descreverOrigem, ORIGENS } from './origens'
import { mesclarMovimentos } from './sincronizacao'

const MOV: Movimento = {
  idTitulo: '0',
  categoria: 'c',
  valorCentavos: 100,
  campoValor: 'x',
  data: '01/07/2026',
  dataEmissao: '',
  dataRegistro: '',
  dataPrevisao: '',
  dataVencimento: '',
  status: '',
  liquidado: 'S',
  documento: 'DOC-1',
  parcela: '',
  contraparte: '',
  contraparteCodigo: '',
  natureza: 'P',
  grupo: '',
  origem: 'EXTP',
  tipoDocumento: '',
  operacao: '',
  contaCorrente: 'cc9',
  jurosCentavos: 0,
  multaCentavos: 0,
  descontoCentavos: 0,
  valorPagoCentavos: 100,
  valorAbertoCentavos: 0,
}

describe('chaveMovimento', () => {
  it('extrato (idTitulo 0 + idMovCC): cc: — cada evento tem identidade própria', () => {
    expect(chaveMovimento({ ...MOV, idMovCC: '555' })).toBe('cc:555')
    expect(chaveMovimento({ ...MOV, idMovCC: '556' })).toBe('cc:556')
  })
  it('título real: t:id|parcela', () => {
    expect(chaveMovimento({ ...MOV, idTitulo: '123', parcela: '002' })).toBe('t:123|002')
  })
  it('sem id nenhum: fingerprint x: — nunca string vazia nem colisão em "0"', () => {
    const k = chaveMovimento(MOV)
    expect(k).toBe('x:DOC-1|cc9|01/07/2026|100')
  })
  it('chaveMovFilial é ALIAS byte-idêntico — o formato está persistido nos mapas de centros', () => {
    for (const m of [MOV, { ...MOV, idMovCC: '7' }, { ...MOV, idTitulo: '9', parcela: '1' }]) {
      expect(chaveMovFilial(m)).toBe(chaveMovimento(m))
    }
  })
})

describe('mesclarMovimentos — a mina desarmada', () => {
  const extrato = (idMovCC: string, valor: number): Movimento => ({ ...MOV, idMovCC, valorCentavos: valor })

  it('🔴 eventos de extrato NÃO colapsam no merge (por idTitulo cru, 3 viravam 1)', () => {
    const atuais = [extrato('1', 100), extrato('2', 200), extrato('3', 300)]
    const r = mesclarMovimentos(atuais, [])
    expect(r.movimentos).toHaveLength(3)
  })

  it('título conhecido atualiza valor sem perder classificação; novo entra inteiro', () => {
    const titulo: Movimento = { ...MOV, idTitulo: '9', parcela: '1', categoria: 'JA_CONCILIADA' }
    const r = mesclarMovimentos([titulo], [{ ...titulo, categoria: 'OUTRA', valorCentavos: 999 }, extrato('4', 50)])
    expect(r.novos).toBe(1)
    expect(r.atualizados).toBe(1)
    const t = r.movimentos.find((m) => m.idTitulo === '9')!
    expect(t.valorCentavos).toBe(999) // valor veio do ERP
    expect(t.categoria).toBe('JA_CONCILIADA') // classificação da equipe preservada
  })
})

describe('origens — o glossário da equipe', () => {
  it('catálogo cobre todas as origens vistas no censo de produção', () => {
    for (const sigla of ['COMP', 'MANP', 'MANR', 'CTEP', 'RPTP', 'APIP', 'BAXP', 'BAXR', 'BARP', 'EXTP', 'EXTR', 'TRAP', 'TRAR', 'NIBO']) {
      expect(ORIGENS.has(sigla), sigla).toBe(true)
    }
  })
  it('transferência avisa a Regra Mãe — não é receita/despesa', () => {
    expect(origemDo('TRAP').classe).toBe('transferencia')
    expect(descreverOrigem('TRAR')).toMatch(/NÃO é receita/)
  })
  it('extrato declara que só tem data de caixa', () => {
    expect(origemDo('EXTP').competenciaNativa).toBe(false)
    expect(origemDo('COMP').competenciaNativa).toBe(true)
  })
  it('lançamento do painel e sigla desconhecida não quebram', () => {
    expect(origemDo('', 'manual:abc').classe).toBe('manual')
    expect(origemDo('ZZZP').nome).toMatch(/ZZZP/)
  })
})
