import { describe, expect, it } from 'vitest'
import { sugerirClassificacao } from './matriz-classificacao'

// Nomes reais da aba "Matriz de Classificação" (C1/C2) — o motor deve reproduzir o de-para do coordenador.
describe('sugerirClassificacao — contas da matriz', () => {
  it.each([
    ['Receita com serviços', 'rb_servicos'],
    ['Receita com vendas', 'receita_bruta'],
    ['Custo serviço prestado', 'cv_csp'],
    ['Custos produto vendido', 'custos_variaveis'],
    ['Compra de Matéria Prima', 'cv_materia'],
    ['Compra de mercadoria p/ revenda', 'cv_mercadoria'],
    ['Impostos sobre receita', 'deducoes'],
    ['Tributos sobre a folha', 'pes_encargos'],
    ['Salários, encargos e benefícios', 'pes_salarios'],
    ['Pró labore', 'pes_prolabore'],
    ['Férias', 'pes_prov_ferias'],
    ['13º Salário', 'pes_decimo'],
    ['Aluguel e condomínio', 'adm_aluguel'],
    ['Telefone e Internet / Internet / Telefonia', 'adm_utilidades'],
    ['Manut. predial/equip./elétrica/imobilizado', 'adm_manutencao'],
    ['Tarifa bancária', 'fin_tarifas'],
    ['Comissões', 'cv_comissoes'],
    ['Motoboys', 'cv_motoboy'],
    ['Frete', 'cv_frete'],
    ['IOF', 'fin_despesas'],
    ['Cartão de crédito', 'fin_cartao'],
    ['Equipamentos de informática', 'inv_imobilizado'],
    ['Aplicações financeiras', 'inv_aplicacoes'],
    ['Resgate aplicação financeira', 'inv_resgates'],
    ['Consórcios', 'inv_consorcios'],
    ['Pagamento de empréstimo', 'fin_amortizacao'],
    ['DINHEIRO EMPRESTADO', 'fin_captacao'],
    ['Antecipação de Lucros', 'fin_distribuicao'],
    ['Distribuição de Lucro', 'fin_distribuicao'],
    ['Transferência entre contas', 'neu_transferencias'],
    ['Adiantamento', 'neu_adiantamentos'],
    ['Estornos', 'neu_estornos'],
    ['Devoluções', 'ded_devolucoes'],
    ['Reembolso', 'cv_recuperacoes'],
    ['Impostos a Recuperar', 'trans_impostos_rec'],
  ])('%s → %s', (conta, esperado) => {
    expect(sugerirClassificacao(conta)?.noId).toBe(esperado)
  })

  it('genéricas de alto valor disparam R3 sem destino (quebrar, não chutar)', () => {
    const s = sugerirClassificacao('Outras despesas')
    expect(s?.noId).toBeNull()
    expect(s?.premissas).toContain('R3')
    expect(sugerirClassificacao('Outras Receitas')?.premissas).toContain('R3')
  })

  it('marca premissas de erro da matriz', () => {
    expect(sugerirClassificacao('DINHEIRO EMPRESTADO')?.premissas).toContain('R2')
    expect(sugerirClassificacao('Antecipação de Lucros')?.premissas).toContain('R1')
    expect(sugerirClassificacao('Comissões')?.premissas).toContain('R11')
    expect(sugerirClassificacao('Compra de Imobilizado')?.premissas).toContain('R7')
    expect(sugerirClassificacao('Cartão de Crédito')?.premissas).toContain('R4')
  })

  it('casa no início de palavra — "Comissões" não cai em ISS', () => {
    expect(sugerirClassificacao('Comissões')?.noId).toBe('cv_comissoes')
    expect(sugerirClassificacao('ISS')?.noId).toBe('ded_iss')
  })

  it('sem opinião para nome desconhecido', () => {
    expect(sugerirClassificacao('Conta Zebra XYZ')).toBeNull()
    expect(sugerirClassificacao('')).toBeNull()
  })
})
