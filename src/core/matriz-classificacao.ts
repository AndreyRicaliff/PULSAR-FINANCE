/**
 * @file Matriz de Classificação AG (entregue pelo coordenador do BPO, 2026-06) como dados puros.
 * Duas peças: as 11 premissas de erro (R1–R11) + Regra Mãe, e o de-para conta-de-origem → nó
 * do plano padrão AG (./plano-padrao). O motor SÓ SUGERE — a matriz existe porque a
 * classificação de origem é não-confiável; auto-aplicar replicaria o erro. Quem concilia decide.
 */
import { normalizarTexto } from './texto'

export type PremissaId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10' | 'R11'

export const PREMISSAS: Readonly<Record<PremissaId, string>> = {
  R1: 'Distribuição/antecipação de lucro como despesa → Destinação/Financiamento',
  R2: 'Empréstimo/transferência no operacional → Financiamento / eliminar',
  R3: "Conta 'Outras' genérica de alto valor → quebrar",
  R4: 'Cartão de crédito como natureza → reclassificar pela natureza real',
  R5: 'Adiantamento como despesa definitiva → conta transitória',
  R6: 'Impostos zerados/espalhados/como custo → dedução da receita; consolidar',
  R7: 'CAPEX em despesa operacional → Investimento',
  R8: 'Plano de contas pulverizado/duplicado → padronizar',
  R9: 'Estorno/devolução como receita → retificadora da origem',
  R10: 'Grupo que mistura receita e despesa → separar',
  R11: 'Custo variável de venda em despesa fixa → mover p/ custos variáveis',
}

export const REGRA_MAE =
  'Toda movimentação que NÃO nasce da operação (empréstimo, transferência, aporte/retirada, ' +
  'distribuição de lucro, aplicação/resgate, compra de imobilizado) nunca entra como receita ' +
  'ou despesa operacional.'

export interface Sugestao {
  /** Nó do plano padrão AG; null = sem destino único (só alerta — ex.: R3 "quebrar"). */
  readonly noId: string | null
  readonly premissas: readonly PremissaId[]
  readonly nota?: string
}

interface Regra extends Sugestao {
  /** Stems sem acento, casados no INÍCIO de palavra (cobre plural/flexão). Ordem importa. */
  readonly termos: readonly string[]
}

// Específica antes de genérica — primeira regra que casa vence.
const REGRAS: readonly Regra[] = [
  { termos: ['perda por erro', 'ressarcimento por erro'], noId: 'cv_ressarcimento', premissas: [] },
  { termos: ['devolucao de compra', 'devolucoes de compra'], noId: 'cv_recuperacoes', premissas: [] },
  { termos: ['reembolso'], noId: 'cv_recuperacoes', premissas: ['R9'], nota: 'Retifica a despesa de origem — não é receita.' },
  { termos: ['receita com servic', 'prestacao de servic'], noId: 'rb_servicos', premissas: [] },
  { termos: ['receita com venda', 'receita de venda'], noId: 'receita_bruta', premissas: [] },
  { termos: ['venda de produto', 'venda de mercadoria fabricada'], noId: 'rb_produtos', premissas: [] },
  { termos: ['outras receita'], noId: null, premissas: ['R3'], nota: 'Genérica de alto valor: quebrar e reclassificar item a item.' },
  { termos: ['dividendo', 'rendimento'], noId: 'fin_receitas', premissas: [], nota: 'Retorno de investimento — Receita Financeira, não operacional.' },
  { termos: ['custo servic', 'custo do servic', 'custo de servic', 'compra de servic'], noId: 'cv_csp', premissas: [] },
  { termos: ['custo'], noId: 'custos_variaveis', premissas: [] },
  { termos: ['servico prestado', 'servicos prestado'], noId: 'rb_servicos', premissas: [] },
  { termos: ['imposto a recuperar', 'impostos a recuperar'], noId: 'trans_impostos_rec', premissas: [] },
  { termos: ['imposto sobre a folha', 'imposto sobre folha', 'tributo sobre a folha', 'tributos sobre a folha'], noId: 'pes_encargos', premissas: ['R6'], nota: 'Encargo de folha — consolidar com os demais tributos sobre a folha.' },
  { termos: ['icms'], noId: 'ded_icms', premissas: [] },
  { termos: ['ipi'], noId: 'ded_ipi', premissas: [] },
  { termos: ['pis'], noId: 'ded_pis', premissas: [] },
  { termos: ['cofins'], noId: 'ded_cofins', premissas: [] },
  { termos: ['iss'], noId: 'ded_iss', premissas: [] },
  { termos: ['simples'], noId: 'ded_das', premissas: [] },
  { termos: ['irpj'], noId: 'irpj', premissas: [] },
  { termos: ['csll', 'contribuicao social'], noId: 'csll', premissas: [] },
  { termos: ['imposto', 'tributo'], noId: 'deducoes', premissas: ['R6'], nota: 'Separar: sobre venda = dedução; IRPJ/CSLL = tributo sobre o lucro.' },
  { termos: ['devoluc', 'ressarcimento'], noId: 'ded_devolucoes', premissas: ['R9'], nota: 'Devolução é retificadora; ressarcimento é recuperação — separar os dois.' },
  { termos: ['estorno'], noId: 'neu_estornos', premissas: ['R9'], nota: 'Retificadora: o ideal é conciliar na conta de origem.' },
  { termos: ['materia prima', 'insumo'], noId: 'cv_materia', premissas: [] },
  { termos: ['embalagen'], noId: 'cv_embalagens', premissas: [] },
  { termos: ['bebida', 'gas de cozinha'], noId: 'cv_materia', premissas: [] },
  { termos: ['compra de mercadoria', 'mercadoria para revenda', 'revenda'], noId: 'cv_mercadoria', premissas: [] },
  { termos: ['comiss'], noId: 'cv_comissoes', premissas: ['R11'], nota: 'Varia com a venda → custo variável, não despesa fixa.' },
  { termos: ['motoboy', 'entregador'], noId: 'cv_motoboy', premissas: ['R11'] },
  { termos: ['frete'], noId: 'cv_frete', premissas: ['R11'] },
  { termos: ['bonifica'], noId: 'cv_bonificacoes', premissas: [] },
  { termos: ['13o', 'decimo terceiro'], noId: 'pes_decimo', premissas: [] },
  { termos: ['provisao de feria'], noId: 'pes_prov_ferias', premissas: [] },
  { termos: ['provisao de 13', 'provisao de decimo'], noId: 'pes_prov_13', premissas: [] },
  { termos: ['feria'], noId: 'pes_prov_ferias', premissas: [], nota: 'Idealmente provisão mensal (~11,11% da folha); o pagamento abate a provisão.' },
  { termos: ['salario', 'ordenado', 'folha de pagamento'], noId: 'pes_salarios', premissas: [] },
  { termos: ['inss', 'fgts', 'encargo'], noId: 'pes_encargos', premissas: [] },
  { termos: ['beneficio', 'vale transporte', 'vale refeicao', 'saude ocupacional', 'assistencia medica', 'refeicao', 'transporte colaborador', 'brinde', 'plano de saude', 'uso funcionario'], noId: 'pes_beneficios', premissas: [] },
  { termos: ['labore', 'prolabore'], noId: 'pes_prolabore', premissas: [], nota: 'Remuneração de sócio é despesa (≠ distribuição de lucro).' },
  { termos: ['colaborador'], noId: 'despesas_pessoal', premissas: ['R8'], nota: 'Conta genérica — reclassificar pela natureza real.' },
  { termos: ['mei'], noId: 'despesas_pessoal', premissas: ['R8'], nota: 'Conferir duplicidade de linhas idênticas.' },
  { termos: ['rescis', 'gratificac', 'diaria', 'treinamento', 'processo trabalhista', 'pensao'], noId: 'despesas_pessoal', premissas: [] },
  { termos: ['aluguel', 'condominio'], noId: 'adm_aluguel', premissas: [] },
  { termos: ['agua', 'luz', 'energia', 'telefon', 'internet', 'comunicac'], noId: 'adm_utilidades', premissas: ['R8'], nota: 'Unificar contas pulverizadas (ex.: 3 contas de telefonia/internet).' },
  { termos: ['material de escritorio'], noId: 'adm_material', premissas: [] },
  { termos: ['contabil', 'juridic', 'auditoria', 'servico contratado', 'servicos contratado'], noId: 'adm_terceiros', premissas: [] },
  { termos: ['software', 'sistema', 'saas', 'licenca'], noId: 'adm_software', premissas: [], nota: 'Assinatura/SaaS = despesa; licença vitalícia/desenvolvimento = CAPEX (Investimento).' },
  { termos: ['manut', 'reforma', 'conservac', 'construc'], noId: 'adm_manutencao', premissas: [], nota: 'Reparo = despesa; melhoria que amplia vida útil = CAPEX (R7).' },
  { termos: ['combustivel'], noId: 'despesas_administrativas', premissas: [], nota: 'Se ligado a entrega/venda → custo variável (R11).' },
  { termos: ['taxa', 'alvara', 'associac', 'contribuic', 'seguro', 'seguranc', 'limpeza', 'dedetizac', 'uso e consumo', 'estacionamento'], noId: 'despesas_administrativas', premissas: [] },
  { termos: ['marketing', 'trafego', 'publicidade', 'propaganda', 'endomarketing', 'evento'], noId: 'com_marketing', premissas: ['R8'], nota: 'Tráfego pago pode ser sub-conta de Marketing — evitar duplicidade.' },
  { termos: ['viage'], noId: 'com_viagens', premissas: [] },
  { termos: ['tarifa'], noId: 'fin_tarifas', premissas: [], nota: 'Resultado financeiro, não despesa administrativa.' },
  { termos: ['iof', 'juro', 'multa', 'despesa financeira', 'despesas financeira'], noId: 'fin_despesas', premissas: [] },
  { termos: ['cartao'], noId: 'fin_cartao', premissas: ['R4'], nota: 'Meio de pagamento, não natureza — explodir a fatura por categoria.' },
  { termos: ['dinheiro emprestado'], noId: 'fin_captacao', premissas: ['R2'], nota: 'Empréstimo captado NÃO é receita — infla faturamento.' },
  { termos: ['pagamento de emprestimo', 'amortizac'], noId: 'fin_amortizacao', premissas: [], nota: 'Só o principal; juros vão para Resultado Financeiro.' },
  { termos: ['coligada', 'mutuo'], noId: 'fin_mutuo_inter', premissas: [], nota: 'Intercompany — eliminar no consolidado do grupo.' },
  { termos: ['emprestimo concedido', 'emprestimos concedido'], noId: 'inv_emprestimos', premissas: [] },
  { termos: ['emprestimo'], noId: 'fin_captacao', premissas: ['R2'] },
  { termos: ['antecipac', 'distribuic'], noId: 'fin_distribuicao', premissas: ['R1'], nota: 'Destinação do resultado — sai da DRE.' },
  { termos: ['aporte'], noId: 'fin_aporte', premissas: [] },
  { termos: ['retirada'], noId: 'fin_retirada', premissas: [] },
  { termos: ['resgate'], noId: 'inv_resgates', premissas: [], nota: 'Só o principal — NÃO é receita.' },
  { termos: ['aplicac', 'investimento'], noId: 'inv_aplicacoes', premissas: [], nota: 'Só o principal; o rendimento vai para Receita Financeira.' },
  { termos: ['consorcio'], noId: 'inv_consorcios', premissas: [], nota: 'Formação de ativo — parcela inteira; taxa adm acerta na contemplação.' },
  { termos: ['equipamento', 'maquina', 'veiculo', 'movel', 'moveis', 'utensilio', 'ultensilio', 'imobilizado', 'ativo fixo', 'instalac', 'informatica'], noId: 'inv_imobilizado', premissas: ['R7'], nota: 'CAPEX não é despesa operacional.' },
  { termos: ['transferenc'], noId: 'neu_transferencias', premissas: ['R2'], nota: 'Caixa↔caixa, efeito zero; no consolidado, eliminação intercompany (R10).' },
  { termos: ['adiantamento'], noId: 'neu_adiantamentos', premissas: ['R5'], nota: 'Não é despesa definitiva — transitória a reconciliar com a despesa real.' },
  { termos: ['outras despesa', 'outros'], noId: null, premissas: ['R3'], nota: 'Genérica de alto valor: quebrar e reclassificar item a item.' },
]

function casa(nome: string, termo: string): boolean {
  return ` ${nome}`.includes(` ${termo}`)
}

/** Sugestão da matriz para o nome de uma conta de origem (null = matriz não opina). */
export function sugerirClassificacao(nomeConta: string): Sugestao | null {
  const nome = normalizarTexto(nomeConta)
  if (!nome) return null
  const regra = REGRAS.find((r) => r.termos.some((t) => casa(nome, t)))
  return regra ? { noId: regra.noId, premissas: regra.premissas, nota: regra.nota } : null
}
