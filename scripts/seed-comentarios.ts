/**
 * Semeia observações SUGERIDAS por slide (baseadas nos valores reais + lógica) para
 * ACME 27 e 36. Texto cru com tokens {{Nome}} — a apresentação substitui pelo valor.
 * São sugestões para o analista revisar/editar. Uso: npx tsx scripts/seed-comentarios.ts
 */
import 'dotenv/config'

const URL = process.env.SUPABASE_URL ?? ''
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const obs27: Record<string, string> = {
  kpis: 'Período lucrativo: resultado líquido de {{Resultado Líquido}} (margem {{Margem Líquida}}) sobre receita líquida de {{Receita Líquida}}. Ponto de atenção: a geração de caixa foi {{Geração de Caixa}}, descolada do lucro — sinal de descasamento entre competência e caixa (verificar prazos de recebimento/pagamento e aplicações).',
  dre: 'Operação saudável: margem de contribuição de {{Margem de Contribuição}} e EBITDA de {{Margem EBITDA}}. As despesas operacionais ({{Despesas Operacionais}}) ficam bem abaixo da margem, o que sustenta o resultado positivo.',
  dfc: 'Apesar do lucro no regime de competência, a variação de caixa foi {{Geração de Caixa}}. Recomenda-se gerir o capital de giro e o calendário de pagamentos para converter resultado em caixa.',
  evolucao: 'No acumulado do período, entradas de {{Entradas}} contra saídas de {{Saídas}}, saldo de {{Saldo}}. Observar os meses de pico de saída para antecipar necessidade de caixa.',
  receita: 'Receita bruta de {{Receita Bruta}} com deduções de {{Deduções}}, resultando em {{Receita Líquida}} de receita líquida — carga de deduções baixa (~3,7%), coerente com o regime tributário.',
  custos: 'Custos concentrados em Custos Variáveis e Pessoal; a folha representa apenas {{Folha / Faturamento}} do faturamento — estrutura enxuta e bem dimensionada.',
  despesas: 'Despesas operacionais de {{Despesas Operacionais}}, abaixo da margem de contribuição ({{Margem de Contribuição}}) — há alavancagem operacional positiva.',
  giro: 'Recebíveis em aberto zerados e pagáveis relevantes (PMP elevado): o recebimento é favorável, mas convém conferir a concentração de vencimentos a pagar para não pressionar o caixa.',
  projecao: 'Sem recebíveis em aberto, a entrada de caixa depende de novas vendas; os títulos a pagar em aberto exigem provisionamento. Planejar cobertura para os vencimentos.',
  neutros: 'Movimentos neutros (transferências/aportes) ficam fora do resultado — conferir se nenhuma receita ou despesa real foi classificada aqui por engano.',
  av: 'Margem líquida de {{Margem Líquida}} sobre a receita. Acompanhar a análise vertical mês a mês para detectar qualquer erosão de margem ao longo do período.',
  avdfc: 'O fluxo operacional sustenta o caixa; investimento/financiamento explicam o descolamento da geração de caixa ({{Geração de Caixa}}) em relação ao lucro.',
}

const obs36: Record<string, string> = {
  kpis: 'Período em prejuízo: resultado líquido de {{Resultado Líquido}} (margem {{Margem Líquida}}). A margem de contribuição é alta ({{Margem de Contribuição}}), então o problema não está no preço nem no custo variável, e sim na estrutura fixa.',
  dre: 'Margem de contribuição forte de {{Margem de Contribuição}}, mas o resultado é negativo porque a folha consome {{Folha / Faturamento}} do faturamento — a estrutura de pessoal está dimensionada acima da receita atual.',
  dfc: 'Variação de caixa de {{Geração de Caixa}}. Com prejuízo operacional, o caixa só se sustenta via aporte de sócio ou redução de estrutura — não é um problema de timing.',
  evolucao: 'As saídas ({{Saídas}}) superam as entradas ({{Entradas}}) no período, saldo de {{Saldo}}. A saída é dominada pela folha de pessoal.',
  receita: 'A receita líquida ({{Receita Líquida}}) está ABAIXO do ponto de equilíbrio ({{Ponto de Equilíbrio}}). Para zerar o prejuízo é preciso elevar o faturamento ou reduzir o custo fixo.',
  custos: 'A Despesa com Pessoal é o maior bloco e domina os custos: folha em {{Folha / Faturamento}} do faturamento é o principal vetor do prejuízo.',
  despesas: 'As despesas operacionais ({{Despesas Operacionais}}) superam a margem de contribuição ({{Margem de Contribuição}}) — é exatamente o que leva ao resultado negativo.',
  giro: 'Pagáveis em aberto com PMP muito alto e sem recebíveis em aberto: atenção redobrada ao caixa para honrar os vencimentos sem nova entrada.',
  projecao: 'Sem recebíveis em aberto e com pagáveis a vencer, o fluxo projetado é negativo. Planejar cobertura de caixa (aporte) enquanto a estrutura é ajustada.',
  neutros: 'Conferir os movimentos neutros para garantir que nenhuma receita/despesa real ficou classificada como transferência ou aporte.',
  av: 'Margem líquida de {{Margem Líquida}}. A análise vertical evidencia o peso da folha sobre a receita mês a mês — base para a meta de enxugamento.',
  avdfc: 'Fluxo operacional negativo: o equilíbrio depende de ajuste de estrutura (folha) e/ou crescimento de receita, não de timing de caixa.',
}

async function salvar(id: string, dados: Record<string, string>): Promise<void> {
  const chave = `cliente:${id}:apresentacao-comentarios-v1`
  const r = await fetch(`${URL}/rest/v1/painel_estado`, {
    method: 'POST',
    headers: {
      apikey: SK,
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ chave, dados }),
  })
  if (!r.ok) throw new Error(`${id}: ${r.status} ${await r.text()}`)
  console.log(`✓ ${chave} — ${Object.keys(dados).length} observações`)
}

await salvar('00000000-0000-4000-8000-000000000027', obs27)
await salvar('00000000-0000-4000-8000-000000000036', obs36)
