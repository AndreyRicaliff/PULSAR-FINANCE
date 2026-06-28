# Matriz de Classificação AG — formato da planilha (handoff para o BPO)

> Este é o contrato da planilha que a equipe de BPO financeiro vai preencher.
> Quando estiver pronta, ela importa **direto** no de-para canônico (`ag_contas`) sem retrabalho.
> A classificação é **conteúdo da equipe**; o sistema só aplica o que estiver aqui.

## Como funciona

Cada linha = uma **conta de origem do ERP** (Omie ou Nibo) e como ela deve ser classificada
nas **duas dimensões** (entra na DRE? entra na DFC?). É o de-para que cresce por cliente
(spec §4.5). Conta que não estiver na planilha cai na fila **"A Conciliar"** — nada é
classificado por adivinhação (spec §3.3).

## Colunas (cabeçalho exato do CSV/Excel)

| Coluna | Obrigatória | Valores aceitos | Observação |
|---|---|---|---|
| `cliente` | sim | texto | nome do cliente (agrupa CNPJs) |
| `origem` | sim | `omie` \| `nibo` | de onde vem o código |
| `codigo_origem` | sim | texto | Omie = `categoria_codigo`; Nibo = `categoria_id` |
| `nome_origem` | não | texto | nome da categoria no ERP (referência) |
| `entra_dre` | sim | `sim` \| `nao` | dimensão 1 |
| `grupo_dre` | se `entra_dre=sim` | ver lista abaixo | linha da DRE waterfall |
| `entra_dfc` | sim | `sim` \| `nao` | dimensão 2 |
| `atividade_dfc` | se `entra_dfc=sim` | `operacional` \| `investimento` \| `financiamento` | atividade da DFC |
| `neutralizada` | sim | `sim` \| `nao` | Regra Mãe: "só dinheiro mudando de lugar" → `sim` (some das demonstrações, fica no log) |
| `confianca` | não | `alta` \| `media` \| `baixa` | default `alta` (de-para confirmado pela equipe) |
| `observacao` | não | texto | justificativa / nota |

### Valores de `grupo_dre`
`receita_bruta` · `deducoes` · `custos_variaveis` · `despesas_pessoal` ·
`despesas_administrativas` · `despesas_comerciais` · `depreciacao` ·
`resultado_financeiro` · `tributos_sobre_lucro`

## Lembrete da Regra Mãe (spec §4.1)

Movimentação que **não nasce da operação** (empréstimo, transferência entre contas próprias,
aporte/retirada de sócio, distribuição de lucro, aplicação/resgate, compra de imobilizado)
**nunca** é Receita ou Despesa operacional:
- normalmente `entra_dre = nao`;
- na DFC entra como `investimento` ou `financiamento` (não `operacional`);
- transferências entre contas próprias e aplicações D+0 → `neutralizada = sim`.

Pergunta de bolso (spec §16): **"isso é resultado (rende/consome) ou é só dinheiro mudando de lugar?"**

## Exemplo (CSV)

```csv
cliente,origem,codigo_origem,nome_origem,entra_dre,grupo_dre,entra_dfc,atividade_dfc,neutralizada,confianca,observacao
Cliente A,omie,1.01.02,Serviços Prestados,sim,receita_bruta,sim,operacional,nao,alta,
Cliente A,omie,2.01.03,Compras de Matéria Prima,sim,custos_variaveis,sim,operacional,nao,alta,
Cliente A,nibo,emprestimo-banco,Empréstimo Bancário,nao,,sim,financiamento,nao,alta,Regra Mãe: não é receita
Cliente A,omie,transf-cc,Transferência entre contas,nao,,nao,,sim,alta,Neutralizada (só muda de lugar)
```
