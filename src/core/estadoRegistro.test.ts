import { describe, expect, it } from 'vitest'
import { estadoDoNome } from './estadoRegistro'

describe('estadoDoNome', () => {
  it('marcador entre parênteses/colchetes, com ou sem acento e em qualquer caixa', () => {
    expect(estadoDoNome('FRETE (EXCLUÍDO)')).toEqual({ limpo: 'FRETE', estado: 'excluido' })
    expect(estadoDoNome('FRETE (excluido)')).toEqual({ limpo: 'FRETE', estado: 'excluido' })
    expect(estadoDoNome('[inativo] Fornecedor X')).toEqual({ limpo: 'Fornecedor X', estado: 'inativo' })
    expect(estadoDoNome('Embalagens {DESATIVADA}')).toEqual({ limpo: 'Embalagens', estado: 'desativado' })
    expect(estadoDoNome('Conta (*** EXCLUIDA ***)')).toEqual({ limpo: 'Conta', estado: 'excluido' })
  })
  it('marcador como prefixo/sufixo DELIMITADO (traço, ponto médio etc.)', () => {
    expect(estadoDoNome('EXCLUIDO - FRETE')).toEqual({ limpo: 'FRETE', estado: 'excluido' })
    expect(estadoDoNome('EMBALAGENS - EXCLUIDA')).toEqual({ limpo: 'EMBALAGENS', estado: 'excluido' })
    expect(estadoDoNome('Motoboys - NÃO USAR')).toEqual({ limpo: 'Motoboys', estado: 'nao-usar' })
    expect(estadoDoNome('iFood · obsoleto')).toEqual({ limpo: 'iFood', estado: 'obsoleto' })
  })
  it('palavra SOLTA nunca é etiqueta — conta legítima fica intacta (review 03/08)', () => {
    expect(estadoDoNome('Estoque Obsoleto')).toEqual({ limpo: 'Estoque Obsoleto' })
    expect(estadoDoNome('Clientes Inativos')).toEqual({ limpo: 'Clientes Inativos' })
    expect(estadoDoNome('EMBALAGENS EXCLUIDA')).toEqual({ limpo: 'EMBALAGENS EXCLUIDA' })
    expect(estadoDoNome('Baixa de contas canceladas')).toEqual({ limpo: 'Baixa de contas canceladas' })
    expect(estadoDoNome('Estorno de venda excluida do lote')).toEqual({ limpo: 'Estorno de venda excluida do lote' })
  })
  it('nome que É só o marcador mantém o original como limpo', () => {
    expect(estadoDoNome('(EXCLUÍDO)')).toEqual({ limpo: '(EXCLUÍDO)', estado: 'excluido' })
  })
  it('sem marcador devolve o nome intacto', () => {
    expect(estadoDoNome('Fornecedores')).toEqual({ limpo: 'Fornecedores' })
  })
})
