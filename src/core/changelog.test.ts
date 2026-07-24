import { describe, expect, it } from 'vitest'
import { CHANGELOG, ROTULO_TAG, ULTIMA_ATUALIZACAO } from './changelog'

describe('changelog — disciplina editorial (§7)', () => {
  it('título cabe em 60 caracteres', () => {
    const longos = CHANGELOG.filter((e) => e.titulo.length > 60).map((e) => e.titulo)
    expect(longos).toEqual([])
  })

  it('data é aaaa-mm-dd válida', () => {
    const ruins = CHANGELOG.filter((e) => !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(e.data))
    expect(ruins).toEqual([])
  })

  it('descrição existe e é uma linha (sem quebra)', () => {
    const ruins = CHANGELOG.filter((e) => !e.desc.trim() || e.desc.includes('\n'))
    expect(ruins).toEqual([])
  })

  it('a tag sempre tem rótulo em PT-BR', () => {
    for (const e of CHANGELOG) expect(ROTULO_TAG[e.tag]).toBeTruthy()
  })

  it('ULTIMA_ATUALIZACAO é a maior data — é o que dispara o dot de não-lido', () => {
    const maior = [...CHANGELOG].map((e) => e.data).sort().at(-1)
    expect(ULTIMA_ATUALIZACAO).toBe(maior)
  })

  it('não fala de commit/refactor — o texto é benefício para o time financeiro', () => {
    const jargao = /refactor|hook|commit|deploy|bug fix|merge|migration/i
    const vazando = CHANGELOG.filter((e) => jargao.test(e.titulo) || jargao.test(e.desc))
    expect(vazando).toEqual([])
  })
})
