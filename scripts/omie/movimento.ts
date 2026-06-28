import type { OmieMovimento } from './schema.ts'
import type { Movimento } from '../../src/core/movimento.ts'

// O movimento da Omie tem forma variável (detalhes/cabecalho/diversos ou na raiz).
// Extraímos categoria e valor de forma defensiva, na mesma ordem que o ERP usa.

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

export function extrairCategoria(mov: OmieMovimento): string {
  const det = obj(mov.detalhes)
  const cab = obj(mov.cabecalho)
  const cats = Array.isArray(mov.categorias) ? mov.categorias : []
  const cat0 = obj(cats[0])
  return str(
    det.cCodCateg || cab.cCodCateg || mov.cCodCateg || mov.codigo_categoria || cat0.cCodCateg,
  ).trim()
}

// Retorna o valor E de qual campo ele veio (auditoria). Pega o primeiro não-zero.
export function extrairValorComCampo(mov: OmieMovimento): { valor: number; campo: string } {
  const det = obj(mov.detalhes)
  const cab = obj(mov.cabecalho)
  const candidatos: ReadonlyArray<readonly [string, unknown]> = [
    ['cabecalho.nValorLanc', cab.nValorLanc],
    ['detalhes.nValorMovCC', det.nValorMovCC],
    ['detalhes.nValorTitulo', det.nValorTitulo],
    ['detalhes.nValorLanc', det.nValorLanc],
    ['nValorLanc', mov.nValorLanc],
    ['nValorMovCC', mov.nValorMovCC],
    ['valor', mov.valor],
    ['nValor', mov.nValor],
  ]
  for (const [campo, bruto] of candidatos) {
    const valor = num(bruto)
    if (valor !== 0) return { valor, campo }
  }
  return { valor: 0, campo: '—' }
}

export function extrairValor(mov: OmieMovimento): number {
  return extrairValorComCampo(mov).valor
}

function centavos(v: unknown): number {
  return Math.round(num(v) * 100)
}

// Hoje a Omie do cliente não rateia por departamento (campo vem vazio); quando o
// coordenador passar a ratear, o código entra aqui sem mudança de pipeline.
export function extrairDepartamento(mov: OmieMovimento): string {
  const det = obj(mov.detalhes)
  const deps = Array.isArray(mov.departamentos) ? mov.departamentos : []
  return str(det.cCodDepartamento || obj(deps[0]).cCodDepartamento)
}

export function extrairMovimento(mov: OmieMovimento): Movimento {
  const det = obj(mov.detalhes)
  const res = obj(mov.resumo)
  const { valor, campo } = extrairValorComCampo(mov)
  return {
    idTitulo: str(det.nCodTitulo),
    categoria: extrairCategoria(mov) || 'SEM_CATEGORIA',
    // Valor exatamente como a Omie devolve (com sinal); centavos é só representação exata.
    valorCentavos: Math.round(valor * 100),
    campoValor: campo,
    data: str(det.dDtEmissao || det.dDtVenc || det.dDtRegistro || det.dDtPagamento || det.dDtConcilia),
    dataEmissao: str(det.dDtEmissao),
    dataRegistro: str(det.dDtRegistro),
    dataPrevisao: str(det.dDtPrevisao),
    dataVencimento: str(det.dDtVenc),
    dataPagamento: str(det.dDtPagamento),
    dataConciliacao: str(det.dDtConcilia),
    status: str(det.cStatus),
    liquidado: str(res.cLiquidado),
    documento: str(det.cNumTitulo || det.cNumDocFiscal),
    parcela: str(det.cNumParcela),
    contraparte: str(det.cCPFCNPJCliente),
    contraparteCodigo: str(det.nCodCliente),
    natureza: str(det.cNatureza),
    grupo: str(det.cGrupo),
    origem: str(det.cOrigem),
    tipoDocumento: str(det.cTipo),
    operacao: str(det.cOperacao),
    contaCorrente: str(det.nCodCC),
    departamento: extrairDepartamento(mov),
    idMovCC: str(det.nCodMovCC),
    jurosCentavos: centavos(res.nJuros),
    multaCentavos: centavos(res.nMulta),
    descontoCentavos: centavos(res.nDesconto),
    valorPagoCentavos: centavos(res.nValPago),
    valorAbertoCentavos: centavos(res.nValAberto),
  }
}
