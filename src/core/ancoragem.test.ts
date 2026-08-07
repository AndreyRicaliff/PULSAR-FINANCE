/**
 * @file O contrato que NÃO pode quebrar: `ancoraDoMovimento` nomeia a proveniência da data
 * mas devolve a MESMA âncora de sempre — nenhum número do app muda. A suíte prova isso por
 * força bruta (toda combinação de presença de campos) contra a fórmula antiga, literal.
 */
import { describe, expect, it } from 'vitest'
import type { Movimento } from './movimento'
import { ancoraDoMovimento, coberturaAncoragem, isoDeMov, type Regime } from './periodo'

const MOV: Movimento = {
  idTitulo: '0',
  categoria: 'c',
  valorCentavos: 100,
  campoValor: 'x',
  data: '',
  dataEmissao: '',
  dataRegistro: '',
  dataPrevisao: '',
  dataVencimento: '',
  status: '',
  liquidado: 'S',
  documento: '',
  parcela: '',
  contraparte: '',
  contraparteCodigo: '',
  natureza: 'P',
  grupo: '',
  origem: 'EXTP',
  tipoDocumento: '',
  operacao: '',
  contaCorrente: '',
  jurosCentavos: 0,
  multaCentavos: 0,
  descontoCentavos: 0,
  valorPagoCentavos: 100,
  valorAbertoCentavos: 0,
}

/** A fórmula ANTIGA, copiada literal de core/periodo.ts pré-07/08 — a referência do contrato. */
const antiga = (m: Movimento, regime: Regime): string | null =>
  regime === 'caixa' ? isoDeMov(m.dataPagamento || m.dataConciliacao || '') : isoDeMov(m.dataEmissao || m.data)

describe('ancoraDoMovimento — equivalência com a fórmula antiga', () => {
  // Cada campo presente ou ausente; datas distintas para detectar troca de precedência.
  const CAMPOS = ['dataEmissao', 'dataVencimento', 'dataRegistro', 'dataPagamento', 'dataConciliacao'] as const
  const VALOR: Record<(typeof CAMPOS)[number], string> = {
    dataEmissao: '01/07/2026',
    dataVencimento: '05/07/2026',
    dataRegistro: '02/07/2026',
    dataPagamento: '10/08/2026',
    dataConciliacao: '12/08/2026',
  }

  it('todas as 32 combinações × 2 regimes × canônica derivada da cadeia do sync', () => {
    for (let bits = 0; bits < 32; bits++) {
      const campos = Object.fromEntries(CAMPOS.map((c, i) => [c, bits & (1 << i) ? VALOR[c] : '']))
      // `data` como o sync grava: primeira da cadeia emissão>venc>registro>pagamento>conciliação.
      const data = CAMPOS.map((c) => campos[c]).find(Boolean) ?? ''
      const m: Movimento = { ...MOV, ...campos, data }
      for (const regime of ['competencia', 'caixa'] as const) {
        expect(ancoraDoMovimento(m, regime).iso, `bits=${bits} regime=${regime}`).toBe(antiga(m, regime))
      }
    }
  })

  it('doc fora da cadeia (manual antigo: só `data`) também não muda', () => {
    const m: Movimento = { ...MOV, data: '15/07/2026' }
    expect(ancoraDoMovimento(m, 'competencia').iso).toBe(antiga(m, 'competencia'))
    expect(ancoraDoMovimento(m, 'competencia').fonte).toBe('canonica')
  })

  it('emissão NÃO-parseável não cai para a canônica (o || é na string, não no parse)', () => {
    const m: Movimento = { ...MOV, dataEmissao: 'lixo', data: '15/07/2026' }
    expect(antiga(m, 'competencia')).toBeNull()
    expect(ancoraDoMovimento(m, 'competencia').iso).toBeNull()
  })
})

describe('ancoraDoMovimento — proveniência (o diagnóstico novo)', () => {
  it('evento de extrato em competência: ancorado por PAGAMENTO, emprestada', () => {
    const m: Movimento = { ...MOV, data: '10/08/2026', dataPagamento: '10/08/2026' }
    const a = ancoraDoMovimento(m, 'competencia')
    expect(a).toEqual({ iso: '2026-08-10', fonte: 'pagamento', emprestada: true })
  })

  it('título com emissão: nativa, nunca emprestada', () => {
    const m: Movimento = { ...MOV, idTitulo: '9', dataEmissao: '01/07/2026', data: '01/07/2026' }
    expect(ancoraDoMovimento(m, 'competencia')).toEqual({ iso: '2026-07-01', fonte: 'emissao', emprestada: false })
  })

  it('vencimento/registro contam como competência nativa (aproximação aceita, não empréstimo)', () => {
    const venc: Movimento = { ...MOV, data: '05/07/2026', dataVencimento: '05/07/2026' }
    expect(ancoraDoMovimento(venc, 'competencia').emprestada).toBe(false)
    expect(ancoraDoMovimento(venc, 'competencia').fonte).toBe('vencimento')
  })

  it('caixa nunca é emprestada — pagamento/conciliação são as datas DELE', () => {
    const m: Movimento = { ...MOV, dataConciliacao: '12/08/2026' }
    expect(ancoraDoMovimento(m, 'caixa')).toEqual({ iso: '2026-08-12', fonte: 'conciliacao', emprestada: false })
  })

  it('sem data nenhuma: fonte nomeada, não undefined', () => {
    expect(ancoraDoMovimento(MOV, 'competencia')).toEqual({ iso: null, fonte: 'nenhuma', emprestada: false })
  })
})

describe('coberturaAncoragem — o número do aviso', () => {
  it('separa nativas × emprestadas × sem data (o que "100% com data" escondia)', () => {
    const movs: Movimento[] = [
      { ...MOV, idTitulo: '1', dataEmissao: '01/07/2026', data: '01/07/2026' },
      { ...MOV, data: '10/08/2026', dataPagamento: '10/08/2026' },
      { ...MOV, data: '11/08/2026', dataPagamento: '11/08/2026' },
      { ...MOV },
    ]
    expect(coberturaAncoragem(movs, 'competencia')).toEqual({ total: 4, nativas: 1, emprestadas: 2, semData: 1 })
  })
})
