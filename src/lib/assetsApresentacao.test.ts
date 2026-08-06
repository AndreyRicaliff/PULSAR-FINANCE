/**
 * @file Regressão: a marca sumia do relatório entregue ao cliente. `<img src="/x.png">` nasce
 * em runtime (React), fora do alcance do inliner que só varre o index.html estático — e num
 * arquivo aberto por file:// o caminho absoluto resolve na raiz do disco. Detectado em 06/08
 * pela rede do HTML exportado: GET /pulsar-finance-wordmark.png → 404.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { WORDMARK } from '@/components/Logo'
import { urlAsset, type SnapshotApresentacao } from './apresentacaoSnapshot'

const DATA_URI = 'data:image/png;base64,iVBORw0KGgo='

const comSnapshot = (assets?: Record<string, string>): void => {
  globalThis.window = { __AG_SNAPSHOT__: { clienteAtivoId: 't', clientes: [], estado: {}, geradoEm: '', assets } as SnapshotApresentacao } as never
}

afterEach(() => {
  globalThis.window = undefined as never
})

describe('urlAsset', () => {
  it('no app normal (sem snapshot) devolve o caminho original', () => {
    globalThis.window = {} as never
    expect(urlAsset(WORDMARK)).toBe(WORDMARK)
  })

  it('no HTML exportado devolve o data: URI embutido', () => {
    comSnapshot({ [WORDMARK]: DATA_URI })
    expect(urlAsset(WORDMARK)).toBe(DATA_URI)
  })

  it('asset que o export não alcançou degrada para o caminho — nunca undefined no src', () => {
    comSnapshot({})
    expect(urlAsset(WORDMARK)).toBe(WORDMARK)
  })

  it('snapshot antigo (sem o campo assets) não quebra', () => {
    comSnapshot(undefined)
    expect(urlAsset(WORDMARK)).toBe(WORDMARK)
  })
})
