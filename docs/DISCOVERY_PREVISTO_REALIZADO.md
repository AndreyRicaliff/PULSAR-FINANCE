# Discovery — Previsto × Realizado via Omie

**Data:** 2026-06-12 · **Chave:** Acme (produção) · **Método:** sondagem read-only direta na API

## Veredito em uma linha

A API expõe previsto×realizado pronto (`ListarOrcamentos`), **mas o previsto está vazio na
Omie da Acme** — o que dá para entregar HOJE é o "previsto realizável" (títulos em aberto
por vencimento), que já está 100% nos nossos dados sincronizados.

## O que a chave dá acesso (testado)

| Endpoint | Call | Status | Conteúdo |
|---|---|---|---|
| `financas/caixa` | `ListarOrcamentos(nAno,nMes)` | OK | 121 categorias × mês: `nValorPrevisto` + `nValorRealizado` (rollup nos pais) |
| `financas/contapagar` | `ListarContasPagar` | OK | títulos a pagar (já cobertos pelo mf) |
| `financas/contareceber` | `ListarContasReceber` | OK | títulos a receber (já cobertos pelo mf) |
| `financas/pesquisartitulos` | `PesquisarLancamentos` | OK | busca de títulos |
| `financas/extrato` | `ObterExtrato` | param inválido na sonda | não exploramos a fundo |

Atenção: `ListarOrcamentos` tem rate-limit agressivo (bloqueio de ~4 min por "consumo
redundante" após poucas chamadas em sequência). Sync deve espaçar ≥20s por mês consultado
ou buscar só o ano corrente.

## Estado do dado na Acme (amostras reais)

| Mês | Previsto (soma) | Realizado (soma c/ rollup) | Categorias com previsto |
|---|---|---|---|
| 06/2026 | R$ 2.386,71 (= R$ 795,57 ×3 rollup) | R$ 625.849,53 | 1 folha (Transporte/diárias) |
| 05/2026 | R$ 0,00 | R$ 1.995.320,70 | 0 |
| 06/2025 | R$ 0,00 | R$ 132.713,37 | 0 |
| 11/2025 | R$ 0,00 | R$ 0,00 | 0 |

→ O módulo de orçamento da Omie **nunca foi preenchido** pelo BPO (o único valor parece teste).
→ O `nValorRealizado` da Omie existe, mas nós já calculamos realizado dos movimentos
sincronizados — usar o nosso evita divergência de regime/critério.

## O que JÁ temos para previsto (sem depender do orçamento Omie)

Dos 461 movimentos sincronizados: **158 títulos em aberto = R$ 386.661,49**, distribuídos por
mês de vencimento até 12/2026 (ex.: 06/26 R$ 168,6 mil; 07–12/26 R$ 3,5 mil/mês recorrentes).
216 movimentos têm `dataPrevisao`. Isso é o **previsto realizável** (compromissos contratados),
diferente do previsto orçamentário (meta).

## Caminhos possíveis

1. **Previsto realizável agora (recomendado como 1º passo):** relatório Previsto × Realizado
   usando títulos em aberto por vencimento vs movimentos pagos — zero dependência externa,
   dado real, entrega imediata.
2. **Orçamento na Omie:** BPO preenche o módulo de orçamento lá; a gente estende o sync com
   `ListarOrcamentos` (ano corrente, 12 chamadas espaçadas). Depende de processo do cliente.
3. **Orçamento no Pulsar Finance:** tela própria de previsto por linha da DRE/DFC × mês
   (persistido em `painel_estado`). Mais trabalho, mas o BPO edita onde já trabalha — e
   desbloqueia também "DRE Gerencial (orçado × realizado)" do catálogo.

Os caminhos 1 e (2 ou 3) são complementares: realizável = curto prazo comprometido;
orçamento = meta gerencial.

## Adendo (2026-06-12) — de onde vem o `nValorRealizado`

Validação empírica (mai/2026, Omie vs nosso espelho mf por categoria):

- O realizado do orçamento da Omie = **baixas efetivas no mês** (pagamentos/recebimentos das
  contas a pagar/receber + lançamentos diretos de conta corrente), por categoria, regime
  caixa. Pais ('1','2','2.01'…) são rollup.
- **Não bate 1:1 com nosso espelho** (Omie R$ 699,7 mil em folhas vs nosso R$ 596,4 mil em
  mai/26): o `ListarMovimentos` é foto POR TÍTULO — `valorPago` é acumulado e `dataPagamento`
  é a última baixa. Título com baixas parciais em meses distintos fica todo atribuído ao mês
  da última baixa; na Omie cada baixa cai no seu mês. Título de baixa única bate centavo a
  centavo (ex.: 2.01.02 = R$ 151,80 nos dois lados).
- Implicação: para um realizado mensal idêntico ao da Omie, a fonte teria que ser as baixas
  (ex.: `ListarOrcamentos.nValorRealizado` mês a mês, ou lançamentos de caixa), não o
  snapshot de títulos. Para tendência e gestão, o nosso espelho é consistente consigo mesmo —
  só não é auditável 1:1 contra o orçamento de caixa da Omie em meses com baixa parcial.

## Resultado (mesmo dia) — possibilidade confirmada e implementada

Backfill real de 24 meses (2025–2026) gravado em `cliente:<id>:orcamento-raw` (21 meses com
dado). Relatório "Previsto × Realizado" no ar com as 3 colunas. Achado adicional: a Omie
projeta lançamentos AGENDADOS no `nValorRealizado` de meses futuros (ex.: 08/26 R$ 12,4 mil)
— útil como visão de curto prazo, rotulado como comportamento do ERP.
