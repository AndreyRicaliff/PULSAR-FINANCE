/**
 * @file Glossário das ORIGENS de movimento (cOrigem da Omie · 'NIBO' · 'manual:').
 *
 * Existe porque a equipe operava às cegas: "EXTP" não diz nada para quem concilia, e a
 * diferença entre título e evento de extrato define COMO o registro se comporta — se tem
 * identidade própria (nCodTitulo), qual data de competência carrega, e se pode aparecer
 * duplicado com a baixa. Censo de produção (07/08/2026, 24 tenants): EXTR 43.627 ·
 * EXTP 22.501 · NIBO 55.687 · MANP 3.750 · TRAP/TRAR 2.568 — os eventos de extrato são
 * a MAIORIA do dado Omie, não um caso raro.
 *
 * Verdade estrutural que o app inteiro assume (verificada no censo: 100%):
 *   título real  → tem idTitulo (nCodTitulo)          → competência nativa (emissão)
 *   evento de extrato/transferência → idTitulo '0', tem idMovCC → SÓ tem data de caixa
 */

export type ClasseOrigem = 'titulo' | 'baixa' | 'extrato' | 'transferencia' | 'manual' | 'integracao'

export interface Origem {
  readonly sigla: string
  readonly nome: string
  /** Para a equipe: o que É este registro, na língua de quem concilia. */
  readonly descricao: string
  readonly classe: ClasseOrigem
  /** true = carrega emissão/competência própria; false = só existe no caixa. */
  readonly competenciaNativa: boolean
}

const O = (sigla: string, nome: string, classe: ClasseOrigem, competenciaNativa: boolean, descricao: string): Origem => ({
  sigla,
  nome,
  classe,
  competenciaNativa,
  descricao,
})

/** Catálogo por sigla. Fonte: dados reais de produção + semântica cOrigem da Omie. */
export const ORIGENS: ReadonlyMap<string, Origem> = new Map(
  [
    O('COMP', 'Compra (título)', 'titulo', true, 'Título de conta a pagar lançado no módulo de compras da Omie. Tem emissão, vencimento e identidade própria.'),
    O('CTEP', 'CT-e (título)', 'titulo', true, 'Título gerado a partir de conhecimento de transporte. Comporta-se como compra.'),
    O('RPTP', 'Recorrência (título)', 'titulo', true, 'Título de lançamento recorrente/programado da Omie (aluguel, assinatura). Nasce de agenda, não de nota.'),
    O('APIP', 'Integração (título)', 'titulo', true, 'Título criado por sistema externo via API da Omie. Conferir o sistema de origem antes de corrigir aqui.'),
    O('MANP', 'Manual a pagar (título)', 'titulo', true, 'Título digitado à mão na Omie (a pagar). Sujeito a erro de digitação — checar duplicidade com a baixa (dedup MANP×BAXP ativo desde 30/07).'),
    O('MANR', 'Manual a receber (título)', 'titulo', true, 'Título digitado à mão na Omie (a receber).'),
    O('BAXP', 'Baixa de pagamento', 'baixa', false, 'Registro da QUITAÇÃO de um título a pagar. Não é despesa nova — é o mesmo título sendo pago (o dedup remove quando o título já está na base).'),
    O('BAXR', 'Baixa de recebimento', 'baixa', false, 'Registro da QUITAÇÃO de um título a receber.'),
    O('BARP', 'Baixa parcial', 'baixa', false, 'Quitação parcial de título — a parte paga; o restante segue em aberto no título.'),
    O('EXTP', 'Extrato — saída', 'extrato', false, 'Débito importado do EXTRATO BANCÁRIO sem título correspondente. Não tem emissão: a única data real é a do pagamento — em regime de competência ele é ancorado por ela (ver docs/DATAS_E_IDENTIDADE.md).'),
    O('EXTR', 'Extrato — entrada', 'extrato', false, 'Crédito importado do extrato bancário sem título. Mesma natureza do EXTP.'),
    O('TRAP', 'Transferência — saída', 'transferencia', false, 'Perna de saída de transferência entre contas da própria empresa. NÃO é despesa (Regra Mãe) — classificar como neutra/transferência.'),
    O('TRAR', 'Transferência — entrada', 'transferencia', false, 'Perna de entrada da transferência. NÃO é receita (Regra Mãe).'),
    O('NIBO', 'Agendamento Nibo', 'integracao', true, 'Schedule do Nibo (título/agendamento). Tem competência (accrualDate); a data de BAIXA é aproximada pelo vencimento — o Nibo não expõe o pagamento real na listagem.'),
  ].map((o) => [o.sigla, o]),
)

const MANUAL_PAINEL: Origem = O('manual', 'Lançamento do painel', 'manual', true, 'Criado pela equipe AG dentro do Pulsar Finance (não existe no ERP). Identidade própria e reversível aqui.')

/** Origem de um movimento — cobre 'manual:*' do painel e sigla desconhecida sem quebrar. */
export function origemDo(origem: string, idTitulo?: string): Origem {
  if (idTitulo?.startsWith('manual:') || origem === 'manual') return MANUAL_PAINEL
  return (
    ORIGENS.get(origem.toUpperCase()) ??
    O(origem || '?', `Origem ${origem || 'desconhecida'}`, 'titulo', true, 'Sigla fora do catálogo — registrar em core/origens.ts ao identificar (a Omie tem origens raras).')
  )
}

/** Uma linha, para tooltip: "EXTP · Extrato — saída: Débito importado…". */
export function descreverOrigem(origem: string, idTitulo?: string): string {
  const o = origemDo(origem, idTitulo)
  return `${o.sigla} · ${o.nome}: ${o.descricao}`
}
