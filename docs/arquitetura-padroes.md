# ADR-001 — Padronização com adaptabilidade (multi-empresa, multi-eixo)

> Status: **proposto** · Data: 2026-06-05 · Escopo: Painel AG (BPO financeiro)
> Apoio: `Especificacao_Sistema_PainelAG_DEV.md` (§2.1, §4.1, §4.2, §4.5, §6, §7).

## Contexto e problema

O Painel AG vai ler **muitas empresas**, de **eixos (segmentos) diferentes** (alimentação,
serviços, distribuição, indústria…), vindas de **ERPs diferentes** (Omie, Nibo) e de planilha.

Cada empresa tem seu próprio plano de contas e suas manias — mas **sempre existe**:
- algo **padrão** (vale pra qualquer empresa: "resgate de aplicação não é receita");
- algo **por contexto** (o código que ESSA empresa usa pra marcar resgate).

Se modelarmos por empresa, cada cliente novo vira retrabalho de código. Se modelarmos só o
padrão, não cabe a realidade de cada uma. Precisamos de **uma forma padrão para tudo — inclusive
para expressar a adaptação de cada caso**.

> Evidência real (Acme): a conta "Outras Receitas" concentra R$ 525k, e o detalhe mostra que é
> **RESGATE** de aplicação — não é receita operacional. O conceito ("resgate ≠ receita") é
> universal; o código `1.04.04` que a Acme usa é específico dela. Os dois precisam coexistir.

## Decisão

**1) Uma língua canônica única.** Todo lançamento de toda empresa/ERP é traduzido para um
**modelo canônico** (o Plano de Contas AG + as 2 dimensões: entra na DRE? entra na DFC/qual
atividade?). Relatórios e indicadores são calculados **uma vez, sobre o canônico**. Empresa,
eixo ou ERP nova **nunca muda o cálculo** — muda só o de-para que leva o dado dela à língua AG.

**2) Adaptação é DADO, não código.** Toda customização (por eixo ou por empresa) é expressa como
**regras** num formato único. Cliente novo = novo pacote de regras, não nova programação.

**3) Resolução em 4 camadas, a mais específica vence (cascata):**

| # | Camada | Vale para | Exemplo | Origem |
|---|--------|-----------|---------|--------|
| 1 | **Universal** | toda empresa | Regra Mãe + 11 premissas: resgate/empréstimo/transferência nunca é receita operacional | padrão AG (versionado) |
| 2 | **Segmento/Eixo** | um tipo de negócio | em "distribuição", frete de compra é custo variável | perfil do segmento |
| 3 | **Empresa** | uma empresa | código `1.04.04` da Acme → conta canônica "Resgate de aplicação" | de-para que cresce (BPO) |
| 4 | **Lançamento** | uma linha | override pontual, não-destrutivo, com auditoria | manual da equipe |

Resolve de baixo pra cima: **lançamento → empresa → segmento → universal**. O que **nenhuma
camada resolve** cai na fila **"A Conciliar"** (§3.3) — nada é classificado por adivinhação.

**4) Um formato único de regra (o que padroniza a própria adaptabilidade):**

```
Regra {
  escopo:    'universal' | { segmento: <id> } | { empresa: <id> } | { lancamento: <id> }
  condicao:  match sobre o lançamento cru
             (códigoComeçaCom, contraparteRegex, naturezaP/R, faixaDeValor, palavraChave…)
  resultado: { contaCanonica, entraDre, grupoDre, entraDfc, atividadeDfc, neutralizada }
  confianca: 'alta' | 'media' | 'baixa'
  origem:    { tipo: 'regra-mae'|'premissa'|'de-para'|'ia'|'manual', porQue, quem, quando }
  prioridade: number   // desempate dentro da mesma camada
}
```

As 4 camadas usam **a mesma estrutura**. A planilha do BPO é um pacote de regras de escopo
`empresa`. Um perfil de segmento é um pacote de escopo `segmento`. A Regra Mãe são regras
`universal` que já vêm no sistema. Adaptar = adicionar regras, sempre no mesmo formato.

## Como segmento × empresa se compõem

Ao cadastrar uma empresa, escolhe-se o **eixo/segmento** → o sistema **pré-carrega** o pacote de
regras daquele segmento (§6, "perfil por segmento, pré-import"). A equipe então só ajusta o que é
específico da empresa, criando regras de escopo `empresa` que **sobrescrevem** o segmento quando
necessário. Nunca se edita o universal nem o segmento direto numa empresa — a especialização é
sempre uma camada acima, preservando o padrão.

## Resolução (contrato)

```
resolver(lancamento, contexto: { empresaId, segmentoId })
  → {
      classificacao,            // resultado canônico
      confianca,
      camadaQueDecidiu,         // universal | segmento | empresa | lancamento
      regraId,                  // rastreabilidade
    }
  // se nenhuma regra casa → status 'a_conciliar' (entra na fila, fora das demonstrações)
```

Princípios:
- **Determinístico e auditável primeiro** (§4.5): de-para e premissas resolvem sem IA. A IA
  (Claude) só entra nos casos que sobram, e o que ela acerta vira regra `de-para` (aprende).
- **Não-destrutivo** (§9): a classificação de origem do ERP nunca é apagada; ajuste é override.
- **Toda decisão sabe "por quê"**: `origem` + `camadaQueDecidiu` + `regraId`.

## Mapa no código

```
src/core/canonico/     língua AG: Plano de Contas AG + as 2 dimensões + tipos
src/core/regras/       formato de Regra + resolver() em cascata (puro, testável)
data/regras/universal/ Regra Mãe + 11 premissas (padrão AG, versionado)
data/regras/segmento/  perfis por eixo (alimentacao.json, servicos.json, distribuicao.json…)
data/regras/empresa/   de-para por empresa (gerado/confirmado pelo BPO — DADO DE CLIENTE, fora do git)
```

O painel atual (categorias / valores / fornecedores) é a **ferramenta de descoberta** que
alimenta as regras: é vendo "Outras Receitas = RESGATE" que a equipe cria a regra de empresa.

## Consequências

**Ganhos:**
- Empresa/eixo/ERP nova entra por **configuração**, não por código.
- Cálculo de DRE/DFC/indicadores é **um só**, sobre o canônico — sem duplicação por empresa.
- Rastreabilidade total: todo número tem regra e camada de origem.
- A planilha do BPO encaixa direto (é o escopo `empresa`).

**Custos / dívida assumida:**
- Exige manter o **Plano de Contas AG canônico** como fonte de verdade (precisa do
  `Plano_de_Contas_AG_Nibo_Omie.md` do BPO).
- A ordem de prioridade entre regras da mesma camada precisa ser explícita (campo `prioridade`).
- Rateio (um lançamento dividido em várias categorias) é tratado depois — começa 1 categoria por
  lançamento.

## Relação com a especificação

Implementa §2.1 (hierarquia/multi-eixo), §4.1–4.2 (Regra Mãe + 11 premissas como camada
universal), §4.5 (aprendizado em camadas: de-para → few-shot → confiança), §6 (perfil por
segmento) e §7 (indicadores sobre o canônico).

## Como explicar em entrevista (30s)

"Padronizei com uma língua canônica única: todo ERP e toda empresa são traduzidos pra ela, e os
relatórios rodam só sobre o canônico. A adaptação a cada empresa é **dado** — regras num formato
único, resolvidas em cascata (universal → segmento → empresa → lançamento, a mais específica
vence). Empresa nova é configuração, não código; e toda classificação é rastreável até a regra que
a decidiu."
