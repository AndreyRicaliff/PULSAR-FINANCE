/**
 * @file O que estes testes travam é a perda de trabalho, não a formatação da assinatura.
 *
 * O bug de 07/08 (equipe financeira perdeu fechamentos) tinha uma causa só: abrir uma
 * apresentação sobrescrevia o roteiro em edição sem perguntar, porque o guard olhava o id
 * do card em vez do conteúdo. Os casos abaixo são, um a um, as sequências reais que a
 * equipe executou — reabrir o mesmo card, voltar depois de trocar de aba, criar uma nova.
 */
import { describe, expect, it } from 'vitest'
import { ROTEIRO_PADRAO, type EstadoApresentacao } from '@/components/apresentacao/tipos'
import { assinar, estadoInicialApresentacao, normalizarApresentacao, perdeTrabalho, temTrabalho } from './rascunhoApresentacao'

const comTexto = (texto: string): EstadoApresentacao => ({
  ...estadoInicialApresentacao(),
  roteiro: [{ tipo: 'secao', secao: 'dre', argumento: texto, observacao: '' }],
})

describe('normalizarApresentacao', () => {
  it('doc vazio vira o roteiro padrão, não um roteiro de zero slides', () => {
    expect(normalizarApresentacao(null).roteiro).toEqual(ROTEIRO_PADRAO)
    expect(normalizarApresentacao({}).roteiro).toEqual(ROTEIRO_PADRAO)
  })
  it('roteiro existente é preservado', () => {
    expect(normalizarApresentacao({ roteiro: [{ tipo: 'livre', id: 'a', titulo: 'X', argumento: '' }] }).roteiro).toHaveLength(1)
  })
  it('tema ausente vira null — herda o da empresa, não o da AG', () => {
    expect(normalizarApresentacao({}).tema).toBeNull()
  })
})

describe('assinar', () => {
  it('não depende da ORDEM DAS CHAVES: mesmo doc vindo do banco e da memória assina igual', () => {
    // O lado do banco vem de JSON.parse (ordem de gravação); o da memória, de spread.
    const doBanco = normalizarApresentacao(JSON.parse('{"periodo":{"ate":"2026-07","de":"2026-07"},"tema":"vinho","capa":{"subtitulo":"S","elaboradoPor":"AG Consultoria","titulo":"T"},"roteiro":[{"observacao":"O","argumento":"A","secao":"dre","tipo":"secao"}]}'))
    const daMemoria: EstadoApresentacao = {
      capa: { titulo: 'T', subtitulo: 'S', elaboradoPor: 'AG Consultoria' },
      roteiro: [{ tipo: 'secao', secao: 'dre', argumento: 'A', observacao: 'O' }],
      periodo: { de: '2026-07', ate: '2026-07' },
      tema: 'vinho',
    }
    expect(assinar(doBanco)).toBe(assinar(daMemoria))
  })

  it('a ORDEM DOS SLIDES conta — reordenar é uma edição de verdade', () => {
    const a: EstadoApresentacao = { ...estadoInicialApresentacao(), roteiro: [ROTEIRO_PADRAO[0]!, ROTEIRO_PADRAO[1]!] }
    const b: EstadoApresentacao = { ...estadoInicialApresentacao(), roteiro: [ROTEIRO_PADRAO[1]!, ROTEIRO_PADRAO[0]!] }
    expect(assinar(a)).not.toBe(assinar(b))
  })

  it('o anexo entra na assinatura — imagem colada é trabalho', () => {
    const semAnexo: EstadoApresentacao = { ...estadoInicialApresentacao(), roteiro: [{ tipo: 'livre', id: 'a', titulo: '', argumento: '' }] }
    const comAnexo: EstadoApresentacao = { ...estadoInicialApresentacao(), roteiro: [{ tipo: 'livre', id: 'a', titulo: '', argumento: '', anexo: 'data:image/png;base64,AAA' }] }
    expect(assinar(semAnexo)).not.toBe(assinar(comAnexo))
  })

  it('slide antigo sem observacao não quebra nem vira "diferente" à toa', () => {
    const antigo = normalizarApresentacao({ roteiro: [{ tipo: 'secao', secao: 'dre', argumento: 'A' }] })
    const novo = normalizarApresentacao({ roteiro: [{ tipo: 'secao', secao: 'dre', argumento: 'A', observacao: '' }] })
    expect(assinar(antigo)).toBe(assinar(novo))
  })
})

describe('temTrabalho', () => {
  it('o roteiro padrão NÃO é trabalho, mesmo trazendo 10 slides e 4 títulos prontos', () => {
    expect(temTrabalho(estadoInicialApresentacao())).toBe(false)
  })
  it('um argumento escrito já é trabalho', () => {
    expect(temTrabalho(comTexto('<p>a</p>'))).toBe(true)
  })
})

/**
 * A regra do indicador no explorador: o roteiro está salvo se BATE COM ALGUMA apresentação
 * da empresa — não só com a que está aberta. Depois de um remount `abertaId` é null, e medir
 * só pela aberta acusaria perda inexistente a cada volta para a aba.
 */
describe('roteiro salvo em alguma apresentação da lista', () => {
  const naoSalvo = (estado: EstadoApresentacao, lista: unknown[]) =>
    temTrabalho(estado) && !lista.some((c) => !perdeTrabalho(estado, c))

  it('bate com uma apresentação que não é a aberta: está salvo, não alarma', () => {
    const escrito = comTexto('<p>fechamento</p>')
    expect(naoSalvo(escrito, [{ roteiro: ROTEIRO_PADRAO }, escrito])).toBe(false)
  })

  it('não bate com nenhuma: alarma', () => {
    expect(naoSalvo(comTexto('<p>só na memória</p>'), [{ roteiro: ROTEIRO_PADRAO }])).toBe(true)
  })

  it('empresa SEM nenhuma apresentação e buffer pristino não alarma (lista vazia)', () => {
    expect(naoSalvo(estadoInicialApresentacao(), [])).toBe(false)
  })

  it('empresa SEM nenhuma apresentação mas com texto escrito alarma — não há onde estar salvo', () => {
    expect(naoSalvo(comTexto('<p>órfão</p>'), [])).toBe(true)
  })
})

describe('perdeTrabalho — as sequências que a equipe financeira executou', () => {
  it('roteiro PRISTINO nunca pede confirmação (senão o aviso vira ruído e ninguém lê)', () => {
    expect(perdeTrabalho(estadoInicialApresentacao(), { roteiro: [{ tipo: 'livre', id: 'x', titulo: 'Cheia', argumento: 'muito texto' }] })).toBe(false)
    expect(perdeTrabalho(estadoInicialApresentacao(), null)).toBe(false)
  })

  it('🔴 REABRIR O MESMO CARD depois de escrever: acusa perda (era o caminho silencioso)', () => {
    const salvoNoBanco = { roteiro: ROTEIRO_PADRAO } // linha criada vazia pelo "+ Nova"
    const escrevendo = comTexto('<p>Margem caiu 12% por conta do CMV</p>')
    expect(perdeTrabalho(escrevendo, salvoNoBanco)).toBe(true)
  })

  it('depois de salvar, reabrir o mesmo card é silencioso — o guard não atrapalha o fluxo bom', () => {
    const escrito = comTexto('<p>Margem caiu 12%</p>')
    expect(perdeTrabalho(escrito, escrito)).toBe(false)
  })

  it('🔴 CRIAR NOVA com trabalho não salvo em cima: acusa perda', () => {
    expect(perdeTrabalho(comTexto('<p>fechamento de julho</p>'), null)).toBe(true)
  })

  it('mudar só o PERÍODO conta como trabalho — é o recorte do fechamento', () => {
    const base = estadoInicialApresentacao()
    const comPeriodo: EstadoApresentacao = { ...base, periodo: { de: '2026-07', ate: '2026-07' } }
    expect(perdeTrabalho(comPeriodo, null)).toBe(true)
  })

  it('mudar só o TEMA conta — é escolha do analista para aquele cliente', () => {
    const comTema: EstadoApresentacao = { ...estadoInicialApresentacao(), tema: 'vinho' }
    expect(perdeTrabalho(comTema, null)).toBe(true)
  })

  it('doc do banco com shape defasado não vira falso positivo', () => {
    // Mesmo conteúdo, gravado antes de `tema` existir no documento.
    const escrito = comTexto('<p>A</p>')
    expect(perdeTrabalho(escrito, { capa: escrito.capa, roteiro: escrito.roteiro, periodo: escrito.periodo })).toBe(false)
  })
})
