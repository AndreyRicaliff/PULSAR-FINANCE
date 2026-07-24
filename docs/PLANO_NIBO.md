# Integração NIBO — plano e ambiente

Status: **Fase 2 CONCLUÍDA e validada com dado real** (2026-07-22) — 1º cliente NIBO em produção:
DR PIZZA (MALVINAS), 3.292 agendamentos sincronizados em ~10s.

Implementação: `GET /schedules` (Credit→R / Debit→P; uma varredura alimenta movimentos E títulos),
`/categories`, `/stakeholders`, `/costcenters`; OData `$orderby/$top/$skip`, 500/pág, header
`ApiToken`, `{ items, count }`. Datas ISO→BR na ingestão. Orçamento omitido (não há equivalente).

### O que a validação campo-a-campo pegou (só aparece com dado real)
1. **Plano tem 3 níveis** (`group` → `subgroupId/Name` → categoria), não 2 — agrupadoras sintetizadas
   nos dois níveis, senão o Plano de Contas perdia o subgrupo.
2. **`/categories` não devolve categorias arquivadas** que os schedules ainda referenciam (52 de 95
   na DR PIZZA) — o cadastro é completado com `categoryName/parent` do próprio schedule, senão o
   GUID cru vazaria como nome (pendência 2026-07-14 fechada para NIBO).
3. **Natureza de agrupadora pela PREDOMINANTE** das filhas — pela "primeira filha", "Receitas
   operacionais" era classificada como despesa.
4. **`paidValue` vem NEGATIVO em débito.** O app usa magnitude + sinal pela natureza, e
   `movimentosCaixa()` filtra `valorPago > 0` → sem `centAbs` os **727 pagamentos sumiriam da DFC**
   (fluxo de caixa só com entradas). Este era o bug mais grave e silencioso.

### Provas
Conciliação preservada **61/61** (as chaves do mapa são os mesmos GUIDs que o adapter produz);
os 1.531 movimentos do import manual anterior bateram com `atualizados: 0` (mapeamento idêntico);
2º sync consecutivo = `0/0/0` (idempotente); regressão Omie OK; provedor desconhecido segue
fail-closed. Schema corrigido: `omie_app_key` era NOT NULL — impedia credencial NIBO
(migration `2026_07_22_credenciais_nibo_notnull.sql`, com CHECK de completude por provedor).

### Resta refinar
Data de baixa: o `/schedules` não expõe a data real do pagamento, então pago aproxima
`dataPagamento = dueDate` (auditado em `campoValor='nibo:baixa~vencimento'`). Afeta só o
**recorte mensal** da DFC, não os totais. Refinar com o extrato (`/entries`) quando necessário.
`/costcenters` veio vazio na DR PIZZA — mapeamento de centro de custo ainda não exercitado.

## Decisão de arquitetura

NIBO entra como **2º provedor** reusando o pipeline do Omie. O armazenamento já é agnóstico:
o front lê `painel_estado` (`cliente:<id>:movimentos-raw`, `cadastros-raw`, `titulos-raw`,
`orcamento-raw`) **sem saber a origem**. Trocar/adicionar provedor não toca no front.

Um cliente tem **um provedor** (coluna `provedor` em `painel_credenciais`). Omie e NIBO
coexistem entre clientes diferentes, cada um com sua credencial própria (fail-closed).

## Já feito (ambiente)

- **Migration `2026_06_19_credenciais_multiprovedor.sql`** (aplicada em prod): `painel_credenciais`
  ganhou `provedor` (`omie`|`nibo`, default `omie`, check), `api_token` e `api_base_url`.
  Linhas existentes → `omie`. Continua service-role-only.
- **Edge `sync-omie`** (deployada): `credenciaisDoCliente` virou ciente do provedor e devolve
  `{ provedor, env }`. O handler ramifica: `provedor === 'omie'` segue o caminho atual
  **inalterado**; qualquer outro provedor é reconhecido e **recusado limpo** (`naoImplementado`,
  fail-closed — nunca grava lixo). Verificado: Omie sincroniza normal após o refactor.

## Contrato do adapter (o que a Fase 2 implementa)

Cada provedor expõe funções equivalentes às do Omie, devolvendo a **MESMA forma canônica**:

| Função (Omie) | Devolve | NIBO precisa produzir |
|---|---|---|
| `buscarOmie(env)` | `Movimento[]` (movimentos/lançamentos) | mapear lançamentos NIBO → `core/movimento.ts::Movimento` |
| `buscarCadastros(env)` | `{ categorias, clientes, departamentos, relatorio }` | categorias, stakeholders, centros de custo NIBO |
| `buscarTitulos(env)` | `Titulo[]` (a pagar/receber) | schedules debit/credit NIBO → `core/titulo.ts::Titulo` |
| `atualizarOrcamento(env)` | grava `orcamento-raw` | orçamento NIBO se existir; senão omitir |

`Movimento` canônico (campos-chave a preencher): `idTitulo, categoria, valorCentavos, data,
dataEmissao, dataVencimento, dataPagamento, natureza ('R'|'P'), contraparte, contraparteCodigo,
contaCorrente, departamento, valorPagoCentavos, valorAbertoCentavos`. Sinal/natureza: NIBO separa
crédito (R) de débito (P) por endpoint — mapear direto, sem inferir.

## Fase 2 (quando houver `apitoken`)

0. **Verificar a API oficial** com o token: auth (`apitoken` header, escopo organização),
   base (`https://api.nibo.com.br/empresas/v1`), endpoints de schedules/categorias/cost-centers/
   accounts, paginação (OData `$skip`/`$top`/`$count`). **Não codar mapeamento de memória.**
1. `adapters/nibo.ts` no edge: `buscarNibo*` com paginação + backoff + fail-closed (skill `sync-erp`).
2. Mapeamento **validado campo-a-campo** contra amostra real (rito do Omie que pegou divergências).
3. Trocar `naoImplementado('nibo')` pela dispatch real.
4. Verificação: sync de um tenant NIBO, conferir contagens, auditar isolamento, comparar 1 título.

## Cadastrar um cliente NIBO (quando chegar o token)

```sql
insert into painel_credenciais (client_id, provedor, api_token)
values ('<uuid-do-tenant>', 'nibo', '<apitoken-da-empresa>');
```

## Limpeza opcional (cosmético)

A função ainda se chama `sync-omie` mas é multi-provedor. Renomear para `sync` exige atualizar
o `supabase.functions.invoke('sync-omie')` em `src/lib/useSync.ts` e redeploy. Fora de escopo agora.
