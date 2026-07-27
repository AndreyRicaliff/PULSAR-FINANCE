# Plano — Lançamentos manuais & Aprovação de contas a pagar

> Desenhado 2026-07-27. Estado: **aguardando duas respostas de negócio** (planilha de
> aprovação real + ciclo iFood) e a decisão sobre e-mails reais antes do lado-cliente.

## A leitura que muda tudo

Até hoje o Pulsar Finance é **espelho do ERP**: todo dado nasce no Omie/Nibo, o app lê,
concilia e apresenta. Estes dois pedidos criam as **primeiras superfícies de escrita** —
e uma delas é do CLIENTE. Isso impõe três regras estruturais:

1. **Tabela própria, nunca o doc raw do sync.** O re-sync sobrescreve
   `cliente:<id>:<base>-raw`; qualquer dado manual guardado ali morreria no próximo sync.
2. **Trilha de quem-fez-o-quê em tudo.** É BPO financeiro: número que aparece/some sem
   autor vira disputa com cliente.
3. **Escrita do cliente só por RPC** (`SECURITY DEFINER` com validação explícita).
   RLS não é por coluna — dar UPDATE direto na tabela deixaria o cliente alterar valor
   e vencimento, não só a decisão. Fail-closed: a tabela nega, a RPC é a única porta.

---

## 1. Lançamentos manuais (SAIPOS / iFood / Cardápio Web)

**Problema:** clientes de alimentação vendem por plataformas que não passam pela conta
bancária → o Omie/Nibo nunca vê → a DRE mostra receita menor que a real.

### Schema

```sql
create table painel_lancamentos_manuais (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references painel_clientes(id),
  data          date not null,
  descricao     text not null,
  valor         numeric(14,2) not null check (valor > 0),
  natureza      text not null check (natureza in ('entrada','saida')),
  categoria     text not null,        -- código do plano de categorias do cliente
  origem        text not null,        -- SAIPOS | IFOOD | CARDAPIO-WEB | livre
  observacao    text,
  criado_por    uuid not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz,
  removido_em   timestamptz,          -- soft-delete: some da DRE, fica na trilha
  removido_por  uuid
);
```

### Decisões

- **Merge como TERCEIRA fonte** no mesmo funil dos adapters (omie/nibo/manual →
  `Movimento` canônico). Id `manual:<uuid>` nunca colide com id de ERP. O lançamento
  aparece em DRE/DFC/conciliação como qualquer movimento.
- **`valor > 0` + natureza separada** — doutrina da EtiquetaFluxo: natureza nunca
  derivada do sinal.
- **Categoria obrigatória no formulário** → não cai em "A Conciliar" → "concilia uma
  vez" vale aqui também. Quem digita já sabe o que é.
- **Etiqueta de origem visível** (mesma doutrina do FONTE OMIE/NIBO em provedor.ts):
  o leitor sempre sabe que aquele número foi digitado, não sincronizado.
- **Soft-delete com autor**, não DELETE.
- RLS: operador CRUD; cliente SELECT dos próprios; tudo atrás de `sessao_verificada()`.

### ⚠ Armadilha aberta — duplicidade venda × repasse

Venda iFood lançada manualmente HOJE + repasse quinzenal caindo na conta via Omie
DAQUI A 15 DIAS = a mesma receita contada 2×. O desenho final depende de como o time
trata isso na planilha hoje (categoria de repasse tratada como transferência? abatem?).
Pergunta relacionada: precisam acompanhar **quanto a plataforma ainda deve repassar**
(saldo a receber por origem)? Se sim, `origem` evolui de etiqueta para conta virtual.

---

## 2. Aprovação de contas a pagar

**Problema:** o cliente precisa aprovar cada conta antes do agendamento/pagamento.
Hoje: planilha. Meta: cliente acompanha e decide do próprio acesso; financeiro
responde pelo acesso adm; a trilha substitui a planilha inteira, histórico incluso.

### Schema

```sql
create table painel_aprovacoes (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references painel_clientes(id),
  titulo_ref   text,                  -- id do título no ERP quando importado
  fornecedor   text not null,
  descricao    text,
  valor        numeric(14,2) not null check (valor > 0),
  vencimento   date not null,
  status       text not null default 'pendente'
               check (status in ('pendente','aprovada','reprovada',
                                 'agendada','paga','cancelada')),
  decidido_por uuid,
  decidido_em  timestamptz,
  criado_por   uuid not null,
  criado_em    timestamptz not null default now()
);

create table painel_aprovacao_eventos (
  id           uuid primary key default gen_random_uuid(),
  aprovacao_id uuid not null references painel_aprovacoes(id) on delete cascade,
  autor        uuid not null,
  tipo         text not null check (tipo in ('criacao','comentario','aprovacao',
               'reprovacao','reabertura','agendamento','pagamento','cancelamento')),
  texto        text,
  criado_em    timestamptz not null default now()
);
```

### Decisões

- **Eventos = a conversa E a auditoria são a mesma coisa.** O "financeiro dá resposta
  sobre cada conta" é um evento `comentario`; a decisão do cliente também é evento.
  Um stream só — nada de campo de chat separado de campo de log.
- **Origem híbrida:** botão "importar títulos em aberto" — o sync JÁ traz títulos do
  Omie e schedules do Nibo (canônico `Titulo`), ninguém redigita — + criação manual
  para o que ainda não está no ERP. Anti-retrabalho.
- **Máquina de estados:** `pendente` →(cliente) `aprovada`|`reprovada`;
  `aprovada` →(financeiro) `agendada` → `paga`; financeiro pode `cancelada` ou
  `reabertura` (reprovada→pendente) — sempre com evento. **Decisão dada não se
  edita** (trigger de freeze, mesma doutrina das apresentações publicadas);
  corrigir = novo ciclo com trilha, nunca UPDATE silencioso.
- **Cliente decide por RPC** `decidir_aprovacao(p_id, p_decisao, p_comentario)` e
  comenta por `comentar_aprovacao(...)`: valida vínculo (`cliente_ids_do_usuario`),
  valida `status = 'pendente'`, grava decisão + evento atomicamente. Guarda por
  parâmetro/contexto explícito — `auth.jwt()` dentro de SECURITY DEFINER é o do
  chamador (lição PULSAR-RH).
- **Lote:** o uso real é aprovar a leva da semana de uma vez → seleção múltipla.
- RLS: operador tudo; cliente SELECT dos próprios (aprovações + eventos); INSERT/
  UPDATE direto só operador; teste fail-closed obrigatório (usuário sem vínculo → 0).

### ⚠ Dependência — identidade de quem aprova

Aprovação de pagamento tem peso de prova. O acesso de cliente atual (ex.: AUTAG) é
login sintético sem caixa de e-mail, potencialmente compartilhado. "Aprovado pelo
cliente" sem e-mail real + 2FA **não prova quem aprovou**. A Fase 2 do auth (e-mails
reais, já pendente) deixa de ser cosmética e vira pré-requisito do lado-cliente.

---

## Fases

| Fase | Entrega | Depende de |
|---|---|---|
| F0 | Migrations + RPCs + RLS provadas em prod (com e sem vínculo) | — |
| F1 | Lançamentos manuais no admin + merge no pipeline + etiqueta | regra da duplicidade |
| F2 | Aprovações lado financeiro (criar, importar títulos, responder) | planilha real |
| F3 | Aprovações lado cliente (lista, decidir/comentar, lote) | decisão e-mail real |
| F4 | Notificações Resend (lote pendente → cliente; decisão → financeiro) + export da trilha | F2+F3 |

## Perguntas abertas (registradas, não bloqueiam F0)

1. Planilha de aprovação atual: colunas e estados reais que o time usa.
2. Ciclo iFood: lançam venda bruta na data? Como marcam o repasse para não duplicar?
   Precisam de saldo "a repassar" por plataforma?
3. Lançamento manual: item a item ou agregado por dia/período? (schema atende os dois;
   muda só o formulário e um futuro import CSV.)
