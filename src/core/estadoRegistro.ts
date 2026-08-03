/**
 * @file Etiqueta de ESTADO embutida no nome pelo time BPO — "FRETE (EXCLUÍDO)",
 * "[inativo] Fornecedor X", "EMBALAGENS - NÃO USAR". O ERP não tem soft-delete de
 * cadastro, então a equipe marca no próprio nome; sem tratamento isso vira "duplicata"
 * indistinguível da conta viva. Aqui o marcador é DETECTADO e SEPARADO: exibe-se o nome
 * limpo + uma etiqueta que simboliza o estado (pedido 03/08). Conservador de propósito:
 * só casa marcador entre (), [], {} ou como prefixo/sufixo isolado — palavra no meio do
 * nome nunca é tratada como etiqueta ("Baixa de contas canceladas" é conta legítima).
 */

export type EstadoRegistro = 'excluido' | 'inativo' | 'desativado' | 'nao-usar' | 'obsoleto'

export const ROTULO_ESTADO: Readonly<Record<EstadoRegistro, string>> = {
  excluido: 'excluído',
  inativo: 'inativo',
  desativado: 'desativado',
  'nao-usar': 'não usar',
  obsoleto: 'obsoleto',
}

export interface NomeComEstado {
  /** Nome sem o marcador (nunca vazio: se o nome ERA só o marcador, mantém o original). */
  readonly limpo: string
  readonly estado?: EstadoRegistro
}

// Ordem importa: primeiro marcador que casar vence.
const MARCADORES: readonly { readonly padrao: string; readonly estado: EstadoRegistro }[] = [
  { padrao: 'exclu[ií]d[oa]s?', estado: 'excluido' },
  { padrao: 'inativ[oa]s?', estado: 'inativo' },
  { padrao: '(?:desativad|desabilitad)[oa]s?', estado: 'desativado' },
  { padrao: 'n[aã]o\\s+(?:usar|utilizar|movimentar)', estado: 'nao-usar' },
  { padrao: 'obsolet[oa]s?', estado: 'obsoleto' },
]

const SEPARADOR = '[\\s\\-–—:·|/*!.]'
// Prefixo/sufixo exigem delimitador EXPLÍCITO (não espaço): "Estoque Obsoleto" e
// "Clientes Inativos" são contas contábeis legítimas — palavra solta nunca é etiqueta
// (falso positivo mutilava o nome e fabricava duplicata falsa; review 03/08).
const DELIMITADOR = '[-–—:·|/*!]'

export function estadoDoNome(nome: string): NomeComEstado {
  for (const { padrao, estado } of MARCADORES) {
    // Entre (), [] ou {} — o caso principal ("em parêntesis etc."), em qualquer posição.
    const entreParenteses = new RegExp(`[(\\[{]${SEPARADOR}*(?:${padrao})${SEPARADOR}*[)\\]}]`, 'i')
    if (entreParenteses.test(nome)) return montar(nome.replace(entreParenteses, ' '), nome, estado)

    // Prefixo/sufixo delimitado ("EXCLUIDO - FRETE", "Motoboys - NÃO USAR").
    const prefixo = new RegExp(`^\\s*(?:${padrao})\\s*${DELIMITADOR}+\\s*`, 'i')
    if (prefixo.test(nome)) return montar(nome.replace(prefixo, ' '), nome, estado)
    const sufixo = new RegExp(`\\s*${DELIMITADOR}+\\s*(?:${padrao})${SEPARADOR}*$`, 'i')
    if (sufixo.test(nome)) return montar(nome.replace(sufixo, ' '), nome, estado)
  }
  return { limpo: nome }
}

function montar(residuo: string, original: string, estado: EstadoRegistro): NomeComEstado {
  const limpo = residuo.replace(/\s+/g, ' ').replace(new RegExp(`^${SEPARADOR}+|${SEPARADOR}+$`, 'g'), '').trim()
  return { limpo: limpo || original.trim(), estado }
}
