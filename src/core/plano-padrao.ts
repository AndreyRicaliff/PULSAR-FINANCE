/**
 * @file Definições do plano de contas gerencial padrão AG e dos tipos de fornecedor.
 * Só DADOS — os tipos e a lógica vivem em ./modelo. Alinhado ao waterfall AG
 * (Complemento_DEV_DRE_DFC §1, §2, §7).
 */
import type { MetaContabil, No } from './modelo'

interface DefSub {
  readonly id: string
  readonly nome: string
  readonly meta?: MetaContabil
}

interface DefGrupo {
  readonly id: string
  readonly nome: string
  readonly meta?: MetaContabil
  readonly subs?: readonly DefSub[]
}

function achatar(defs: readonly DefGrupo[]): No[] {
  return defs.flatMap((g) => [
    { id: g.id, nome: g.nome, paiId: null, meta: g.meta },
    ...(g.subs ?? []).map((s) => ({ id: s.id, nome: s.nome, paiId: g.id, meta: s.meta ?? g.meta })),
  ])
}

const OPERACIONAL = 'operacional' as const

const DEF_CONTAS: readonly DefGrupo[] = [
  {
    id: 'receita_bruta',
    nome: '1. Receita Bruta',
    meta: { papelDRE: 'receita_bruta', atividadeDFC: OPERACIONAL },
    subs: [
      { id: 'rb_produtos', nome: 'Venda de Produtos' },
      { id: 'rb_mercadorias', nome: 'Revenda de Mercadorias' },
      { id: 'rb_servicos', nome: 'Prestação de Serviços' },
      { id: 'rb_canais', nome: 'Receita por Canal (Delivery/Balcão/Marketplace)' },
      { id: 'rb_outras', nome: 'Outras Receitas Operacionais' },
    ],
  },
  {
    id: 'deducoes',
    nome: '2. Deduções e Impostos sobre Venda',
    meta: { papelDRE: 'deducao', atividadeDFC: OPERACIONAL },
    subs: [
      { id: 'ded_das', nome: 'Simples Nacional (DAS)' },
      { id: 'ded_pis', nome: 'PIS' },
      { id: 'ded_cofins', nome: 'COFINS' },
      { id: 'ded_icms', nome: 'ICMS' },
      { id: 'ded_ipi', nome: 'IPI' },
      { id: 'ded_iss', nome: 'ISS' },
      { id: 'ded_devolucoes', nome: 'Devoluções de Venda' },
      { id: 'ded_descontos', nome: 'Descontos Comerciais' },
    ],
  },
  {
    id: 'custos_variaveis',
    nome: '3. Custos Variáveis (CMV / CSP)',
    meta: { papelDRE: 'custo_variavel', atividadeDFC: OPERACIONAL },
    subs: [
      { id: 'cv_materia', nome: 'Matéria-prima / Insumos' },
      { id: 'cv_mercadoria', nome: 'Mercadoria para Revenda' },
      { id: 'cv_embalagens', nome: 'Embalagens' },
      { id: 'cv_comissoes', nome: 'Comissões sobre Vendas' },
      { id: 'cv_frete', nome: 'Frete sobre Vendas' },
      { id: 'cv_motoboy', nome: 'Motoboy / Logística de Entrega' },
      { id: 'cv_csp', nome: 'Custo dos Serviços Prestados' },
      { id: 'cv_bonificacoes', nome: 'Bonificações sobre Vendas' },
      { id: 'cv_ressarcimento', nome: 'Ressarcimento / Perda por Erro (KPI não-qualidade)' },
      { id: 'cv_recuperacoes', nome: 'Recuperação de Desp. Variáveis (Reembolso/Devol. de Compra)' },
    ],
  },
  {
    id: 'despesas_pessoal',
    nome: '4. Despesas com Pessoal',
    meta: { papelDRE: 'despesa_operacional', atividadeDFC: OPERACIONAL },
    subs: [
      { id: 'pes_salarios', nome: 'Salários e Ordenados' },
      { id: 'pes_decimo', nome: '13º Salário' },
      { id: 'pes_encargos', nome: 'Encargos Sociais (INSS/FGTS)' },
      { id: 'pes_beneficios', nome: 'Benefícios (VT/VR/Saúde)' },
      { id: 'pes_prolabore', nome: 'Pró-labore' },
      // Provisões são só-DRE (competência); o caixa só aparece quando paga — Matriz AG.
      { id: 'pes_prov_ferias', nome: 'Provisão de Férias (~11,11% da folha)', meta: { papelDRE: 'despesa_operacional' } },
      { id: 'pes_prov_13', nome: 'Provisão de 13º (~8,33% da folha)', meta: { papelDRE: 'despesa_operacional' } },
      { id: 'pes_prov_encargos', nome: 'Provisão de Encargos s/ Férias e 13º', meta: { papelDRE: 'despesa_operacional' } },
    ],
  },
  {
    id: 'despesas_administrativas',
    nome: '5. Despesas Administrativas',
    meta: { papelDRE: 'despesa_operacional', atividadeDFC: OPERACIONAL },
    subs: [
      { id: 'adm_aluguel', nome: 'Aluguel e Condomínio' },
      { id: 'adm_utilidades', nome: 'Utilidades (Água/Luz/Telecom)' },
      { id: 'adm_terceiros', nome: 'Serviços de Terceiros (Contábil/Jurídico)' },
      { id: 'adm_software', nome: 'Software / TI / SaaS' },
      { id: 'adm_material', nome: 'Material de Escritório' },
      { id: 'adm_manutencao', nome: 'Manutenção e Conservação' },
    ],
  },
  {
    id: 'despesas_comerciais',
    nome: '6. Despesas Comerciais',
    meta: { papelDRE: 'despesa_operacional', atividadeDFC: OPERACIONAL },
    subs: [
      { id: 'com_marketing', nome: 'Marketing e Publicidade (incl. Tráfego Pago)' },
      { id: 'com_parcerias', nome: 'Parcerias e Patrocínios' },
      { id: 'com_viagens', nome: 'Viagens e Representação' },
    ],
  },
  {
    id: 'depreciacao',
    nome: '7. Depreciação e Amortização',
    meta: { papelDRE: 'depreciacao' },
    subs: [
      { id: 'dep_maquinas', nome: 'Depreciação de Máquinas e Equipamentos' },
      { id: 'dep_veiculos', nome: 'Depreciação de Veículos' },
      { id: 'dep_informatica', nome: 'Depreciação de Informática' },
      { id: 'dep_intangivel', nome: 'Amortização de Intangível' },
    ],
  },
  {
    id: 'resultado_financeiro',
    nome: '8. Resultado Financeiro',
    meta: { papelDRE: 'resultado_financeiro', atividadeDFC: OPERACIONAL },
    subs: [
      { id: 'fin_receitas', nome: 'Receitas Financeiras (Juros/Rendimentos)' },
      { id: 'fin_despesas', nome: 'Despesas Financeiras (Juros/IOF/Multas)' },
      { id: 'fin_tarifas', nome: 'Tarifas Bancárias' },
      { id: 'fin_cartao', nome: 'Cartão de Crédito (fatura — explodir por natureza)' },
      { id: 'fin_cambial', nome: 'Variação Cambial' },
    ],
  },
  {
    id: 'tributos_lucro',
    nome: '9. Tributos sobre o Lucro',
    meta: { papelDRE: 'tributo_lucro', atividadeDFC: OPERACIONAL },
    subs: [
      { id: 'irpj', nome: 'IRPJ' },
      { id: 'csll', nome: 'CSLL' },
    ],
  },
  {
    id: 'investimento',
    nome: '10. Investimento (CAPEX) — DFC',
    meta: { atividadeDFC: 'investimento' },
    subs: [
      { id: 'inv_imobilizado', nome: 'Aquisição de Imobilizado' },
      { id: 'inv_intangivel', nome: 'Aquisição de Intangível' },
      { id: 'inv_aplicacoes', nome: 'Aplicações Financeiras (Principal)' },
      { id: 'inv_resgates', nome: 'Resgate de Aplicações / Venda de Ativos' },
      { id: 'inv_emprestimos', nome: 'Empréstimos Concedidos a Terceiros' },
      { id: 'inv_consorcios', nome: 'Consórcios (formação de ativo)' },
    ],
  },
  {
    id: 'financiamento',
    nome: '11. Financiamento — DFC',
    meta: { atividadeDFC: 'financiamento' },
    subs: [
      { id: 'fin_captacao', nome: 'Empréstimos Tomados (Captação)' },
      { id: 'fin_amortizacao', nome: 'Amortização de Empréstimos (Principal)' },
      { id: 'fin_aporte', nome: 'Aporte de Capital' },
      { id: 'fin_retirada', nome: 'Retirada de Capital' },
      { id: 'fin_distribuicao', nome: 'Distribuição / Antecipação de Lucros' },
      {
        id: 'fin_mutuo_inter',
        nome: 'Mútuo a/de Coligadas (Intercompany)',
        meta: { atividadeDFC: 'financiamento', intercompany: true },
      },
      {
        id: 'fin_aporte_inter',
        nome: 'Aporte/Retirada a Coligadas (Intercompany)',
        meta: { atividadeDFC: 'financiamento', intercompany: true },
      },
    ],
  },
  {
    // Matriz AG: adiantamento/imposto a recuperar mexem no caixa (DFC operacional) mas não
    // são resultado — fora da DRE, dentro da DFC. Id neu_adiantamentos preservado (de-paras salvos).
    id: 'transitorias',
    nome: '12. Contas Transitórias (Ativo)',
    meta: { atividadeDFC: OPERACIONAL },
    subs: [
      { id: 'neu_adiantamentos', nome: 'Adiantamentos a Compensar' },
      { id: 'trans_impostos_rec', nome: 'Impostos a Recuperar' },
    ],
  },
  {
    id: 'neutros',
    nome: '13. Movimentos Neutros (Regra Mãe)',
    meta: { neutra: true },
    subs: [
      { id: 'neu_transferencias', nome: 'Transferência entre Contas Próprias' },
      { id: 'neu_aplicacao_d0', nome: 'Aplicação Automática D+0' },
      { id: 'neu_resgate_d0', nome: 'Resgate Automático D+0' },
      { id: 'neu_estornos', nome: 'Estornos / Devoluções de Movimento' },
    ],
  },
]

/**
 * Nós aposentados pela Matriz de Classificação → destino. Aplicado ao carregar o modelo
 * salvo, para de-paras antigos não sumirem do espelho/DRE em silêncio.
 */
export const MIGRACAO_NOS: Readonly<Record<string, string>> = {
  adm_tarifas: 'fin_tarifas', // tarifa bancária é resultado financeiro, não admin
  com_frete_venda: 'cv_frete', // R11: frete varia com a venda → custo variável
  pes_provisoes: 'despesas_pessoal', // dividida em férias/13º/encargos — re-refinar no grupo
}

const DEF_FORNECEDORES: readonly DefGrupo[] = [
  { id: 'forn_mercadorias', nome: 'Fornecedores de Mercadorias / MP' },
  {
    id: 'forn_servicos',
    nome: 'Prestadores de Serviço',
    subs: [
      { id: 'forn_serv_pj', nome: 'Serviços PJ' },
      { id: 'forn_serv_pf', nome: 'Serviços PF / Autônomos' },
    ],
  },
  { id: 'forn_pessoal', nome: 'Folha / Funcionários' },
  { id: 'forn_socios', nome: 'Sócios' },
  { id: 'forn_coligadas', nome: 'Empresas Coligadas (Grupo)' },
  { id: 'forn_bancos', nome: 'Bancos / Instituições Financeiras' },
  { id: 'forn_governo', nome: 'Governo / Impostos' },
  { id: 'forn_locadores', nome: 'Locadores (Aluguel)' },
  { id: 'forn_utilidades', nome: 'Concessionárias / Utilidades' },
  { id: 'forn_marketing', nome: 'Marketing / Agências' },
  { id: 'forn_logistica', nome: 'Transportadoras / Logística' },
  { id: 'forn_clientes', nome: 'Clientes (Receita)' },
  { id: 'forn_aplicacoes', nome: 'Aplicações / Investimentos' },
]

export const ESTRUTURA_PADRAO_AG: readonly No[] = achatar(DEF_CONTAS)
export const ESTRUTURA_PADRAO_FORNECEDORES: readonly No[] = achatar(DEF_FORNECEDORES)
