/** @file Eixos de agrupamento disponíveis no drill-down e seus rótulos. */
import { chaveContraparte, type Movimento } from '@/core/movimento'
import type { Resolvedor } from '@/core/override'

export type Eixo =
  | 'contraparte'
  | 'categoria'
  | 'origem'
  | 'tipoDocumento'
  | 'status'
  | 'natureza'
  | 'liquidado'
  | 'operacao'
  | 'contaCorrente'
  | 'mes'

export const EIXOS: readonly { id: Eixo; rotulo: string }[] = [
  { id: 'contraparte', rotulo: 'Contraparte' },
  { id: 'categoria', rotulo: 'Categoria' },
  { id: 'origem', rotulo: 'Origem' },
  { id: 'tipoDocumento', rotulo: 'Tipo de doc.' },
  { id: 'status', rotulo: 'Status' },
  { id: 'natureza', rotulo: 'Natureza' },
  { id: 'liquidado', rotulo: 'Situação' },
  { id: 'operacao', rotulo: 'Operação' },
  { id: 'contaCorrente', rotulo: 'Conta corrente' },
  { id: 'mes', rotulo: 'Mês' },
]

// Detalhamento para o time BPO: o que cada eixo revela. Só reagrupa o dado cru da Omie.
export const DESCRICAO_EIXO: Readonly<Record<Eixo, string>> = {
  contraparte:
    'De quem veio / para quem foi. Revela a fonte real de contas genéricas (ex.: "Outras Receitas" que na verdade é resgate de um banco).',
  categoria: 'Em quais categorias do plano de contas esse fornecedor/cliente aparece.',
  origem:
    'Como entrou na Omie (siglas do ERP, ex.: COMP compra, MANP manual, TRAP/TRAR transferência). Útil para achar transferências e lançamentos manuais.',
  tipoDocumento: 'Tipo do documento (ex.: NFE, BOL, CTE). Separa o que tem nota fiscal do que não tem.',
  status: 'Situação do título (cancelado, atrasado, pago/recebido). Use para isolar cancelados.',
  natureza: 'Conta a pagar (saída) ou a receber (entrada).',
  liquidado: 'Já foi pago/recebido (caixa) ou ainda está em aberto (competência).',
  operacao: 'Código de operação da Omie — agrupa lançamentos do mesmo tipo de operação.',
  contaCorrente: 'Conta bancária por onde passou o lançamento.',
  mes: 'Distribui o valor pelos meses — mostra sazonalidade ou um lançamento pontual fora do padrão.',
}

export const SEM_AGRUPAR = 'Lista todos os lançamentos, sem agrupar.'

const VALOR_ROTULO: Readonly<Record<string, string>> = {
  P: 'A pagar',
  R: 'A receber',
  S: 'Pago / Recebido',
  N: 'Em aberto',
}

export function classificar(
  m: Movimento,
  eixo: Eixo,
  resolvedor: Resolvedor,
): { chave: string; rotulo: string } {
  switch (eixo) {
    case 'contraparte': {
      const chave = chaveContraparte(m)
      return { chave, rotulo: resolvedor.contraparte(chave).nome }
    }
    case 'categoria':
      return { chave: m.categoria || 'SEM', rotulo: resolvedor.categoria(m.categoria).nome }
    case 'mes': {
      const x = mesDe(m.data)
      return { chave: x, rotulo: x }
    }
    case 'natureza':
      return rotulado(m.natureza)
    case 'liquidado':
      return rotulado(m.liquidado)
    case 'origem':
      return simples(m.origem)
    case 'tipoDocumento':
      return simples(m.tipoDocumento)
    case 'status':
      return simples(m.status)
    case 'operacao':
      return simples(m.operacao)
    case 'contaCorrente':
      return simples(m.contaCorrente)
  }
}

function rotulado(v: string): { chave: string; rotulo: string } {
  const k = v || '—'
  return { chave: k, rotulo: VALOR_ROTULO[k] ?? k }
}

function simples(v: string): { chave: string; rotulo: string } {
  const k = v || '—'
  return { chave: k, rotulo: k }
}

function mesDe(data: string): string {
  const partes = data.split('/')
  return partes.length === 3 ? `${partes[1]}/${partes[2]}` : 'Sem data'
}
