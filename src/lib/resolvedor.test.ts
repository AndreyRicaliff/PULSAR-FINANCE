import { describe, expect, it } from 'vitest'
import type { Categoria } from '@/core/categoria'
import { OVERRIDES_VAZIO } from '@/core/override'
import { criarResolvedor } from './resolvedor'

const cat = (codigo: string, descricao: string, ativa = true): Categoria => ({
  codigo,
  descricao,
  natureza: 'despesa',
  paiCodigo: '',
  agrupadora: false,
  ativa,
  entraNoDre: true,
})

const CATS = [cat('2.01', 'Reembolsos'), cat('2.02', 'Pró Labore', false)]

describe('estado estrutural da categoria (como a Omie marca de verdade)', () => {
  const r = criarResolvedor(OVERRIDES_VAZIO, CATS, {})
  it('ativa=false vira etiqueta inativo, com o nome intacto', () => {
    expect(r.categoria('2.02')).toMatchObject({ nome: 'Pró Labore', estado: 'inativo' })
  })
  it('código que sumiu do cadastro vira excluído', () => {
    expect(r.categoria('9.99')).toMatchObject({ nome: '9.99', estado: 'excluido' })
  })
  it('categoria viva não ganha etiqueta', () => {
    expect(r.categoria('2.01').estado).toBeUndefined()
  })
  it('cadastro vazio (boot) não marca nada — senão tudo nasceria excluído', () => {
    const vazio = criarResolvedor(OVERRIDES_VAZIO, [], {})
    expect(vazio.categoria('2.01').estado).toBeUndefined()
  })
  it('etiqueta textual no override vence a estrutural (controle manual)', () => {
    const comOv = criarResolvedor({ ...OVERRIDES_VAZIO, categoria: { '2.02': 'Pró Labore (excluído)' } }, CATS, {})
    expect(comOv.categoria('2.02')).toMatchObject({ nome: 'Pró Labore', estado: 'excluido', editado: true })
  })
})
