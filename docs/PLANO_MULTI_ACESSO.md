# Plano — Múltiplos acessos + edição concorrente + realtime

Status: **PLANEJADO** (2026-07-24). Nada implementado ainda. Fases independentes, cada uma
com verificação objetiva; a ordem importa (0 → 1 → 2; 3/4 podem trocar de lugar).

## Estado atual (verificado em prod, 2026-07-24)

- **Contas:** 2 usuários auth (1 operador AG, 1 cliente AUTAG). `painel_acessos(user_id,
  cliente_id, papel)` com RLS role-aware fail-closed (operador R/W tudo; cliente read-only
  no prefixo `cliente:<id>:%`). Edge `manage-user` (operador cria conta/senha/remove).
- **Persistência:** `useEstadoSincronizado` — store por chave em memória + localStorage +
  upsert debounced (600ms) do **doc inteiro** em `painel_estado`. Falha de gravação é
  engolida (`console.error`) — pendência conhecida.
- **Realtime:** inexistente. Publication `supabase_realtime` sem tabelas. Outra sessão só
  vê mudança com F5.
- **Payloads:** `movimentos-raw` chega a **1,1 MB** (média 358 kB); os docs editáveis
  (modelo ~9 kB, overrides, demonstracoes) são pequenos.

## Os 3 problemas, em ordem de perigo

1. **Escrita concorrente perde trabalho HOJE.** Dois operadores no mesmo cliente: o
   debounce de quem salvar por último **sobrescreve o doc inteiro** do outro (classificou
   10 categorias → colega salva 1 rename → suas 10 somem). Silencioso — é o mesmo perfil
   do bug do cliente-fantasma: grava "com sucesso" no lugar errado.
2. **Ninguém vê o que o outro fez** sem F5 (nem sync do ERP aparece pra quem está com a
   tela aberta).
3. **Só existe 1 papel de escrita** (operador = tudo). Equipe crescendo → precisa de
   carteira (analista vê/edita só os clientes dele).

## Decisões de arquitetura

### D1 — Concorrência: `rev` + compare-and-set + merge por domínio (NÃO CRDT)
`painel_estado` ganha `rev uuid` (trigger bumpa a cada UPDATE) e `atualizado_por`.
O front grava com `update ... where rev = :revVista` (CAS). Conflito (0 linhas) →
refetch → **merge de domínio** → retenta:
- `mapa`/`overrides`/`mapaSub`/`mapaClasse` (Record chave→valor): merge **por chave** —
  união; a mesma chave editada pelos dois = mais novo vence NAQUELA chave, não no doc.
  É o caso real (duas pessoas classificando categorias diferentes) e converge sempre.
- `estrutura` (array de nós): merge por `id` de nó; conflito no mesmo nó = mais novo
  vence. Raro e aceitável.
- Funções puras em `core/merge.ts`, testadas (o harness jsdom/vitest já existe).
**Por quê não CRDT/Yjs:** os dados são Records por chave estável — merge por chave já é
convergente; CRDT adicionaria dependência pesada pra resolver um problema que o domínio
não tem (não é texto colaborativo).

### D2 — Realtime por TABELA-SINAL (não por payload)
Payload de 1,1 MB mata Postgres Changes direto na tabela (limite ~1 MB e broadcast caro).
Criar `painel_estado_rev (cliente_id uuid, chave text pk, rev uuid, autor uuid, em
timestamptz)` mantida por trigger de `painel_estado`. O front assina **só a tabela-sinal**
(linhas de ~100 bytes), filtro `cliente_id=eq.<ativo>`, e ao receber o sinal:
- ignora eco (rev == a que a própria sessão acabou de gravar);
- se o store local está `sujo` (edição não salva), adia e deixa o CAS resolver;
- senão refetch do doc via select normal (RLS aplica) → `emitir()` → toda a UI atualiza.
Bônus de graça: **sync do ERP** atualiza `movimentos-raw` → dispara o mesmo sinal → quem
está com o cliente aberto vê o dado novo sem F5.
`painel_estado` precisa de colunas `cliente_id`/`base` reais (backfill de `split_part`)
— filtro de realtime não faz LIKE em prefixo de `chave`.

### D3 — Papéis: generalizar de "operador" para acesso com escopo
`eh_operador()` → `pode_escrever(uid, cliente_id)`:
- **operador**: tudo (como hoje);
- **analista** (novo): R/W só nos clientes da carteira dele (linhas em `painel_acessos`
  com papel `analista`);
- **cliente**: read-only no próprio tenant (como hoje).
Policies de `painel_estado`/`painel_clientes` passam a usar a função nova; a aba Acessos
ganha o papel no formulário. Realtime respeita as MESMAS policies (Postgres Changes só
entrega linha que o usuário pode ler).

### D4 — Auditoria mínima de quem mudou o quê
`atualizado_por` + `em` na tabela-sinal JÁ é a trilha (chave × autor × quando). Painel de
histórico é opcional futuro; o dado nasce gravado desde a Fase 0.

### D5 — Presença (opcional, última fase)
Supabase channel presence: "quem está olhando este cliente" no topo + aviso brando se dois
abrirem a Matriz do mesmo cliente. Não bloqueia nada (soft), só reduz a chance de conflito
antes do CAS precisar agir.

## Fases

| # | Entrega | Verificação objetiva |
|---|---|---|
| **0** | Migration: `cliente_id`/`base`/`rev`/`atualizado_por` em `painel_estado` (backfill) + trigger de rev + `painel_estado_rev` + publication. Zero mudança de front. | SQL: backfill 100% (`count where cliente_id is null` = 0); app atual continua funcionando intacto; re-run da migration é no-op. |
| **1** | Escrita segura: CAS + `core/merge.ts` + erro de gravação VISÍVEL (toast + retry; mata a pendência do `salvarRemoto` engolir erro). | Testes unit de merge (convergência das 3 formas); teste jsdom de conflito simulado (2 escritas → união); manual: 2 abas classificando → nada se perde. |
| **2** | Realtime read: hook `useSinalRealtime(clienteId)` assinando `painel_estado_rev`; rehydrate com guarda de eco/sujo. | 2 browsers logados: classificar num → aparecer no outro < 2s sem F5; sync do ERP → tela aberta atualiza sozinha. Verificar com dado (não print — aba oculta pausa rAF nesta máquina). |
| **3** | Contas em escala: papel `analista` + carteira nas policies (`pode_escrever`), formulário na aba Acessos; contas de cliente em lote pros 24 tenants (via `manage-user`, senhas definidas pelo operador). | Teste de RLS simulando JWT dos 3 papéis (rito da migration de 07/16): analista fora da carteira = 0 linhas/write negado; cliente segue read-only. |
| **4** | Presença + polimento: avatares "online neste cliente", aviso de co-edição. | 2 sessões no mesmo tenant se veem; sair fecha presença. |

Esforço estimado: F0 ½ dia · F1 1–2 dias (o merge é o coração) · F2 1 dia · F3 1 dia · F4 ½ dia.

## O que NÃO fazer (e por quê)

- **CRDT/Yjs** — domínio já converge com merge por chave (D1).
- **Postgres Changes direto em `painel_estado`** — payload de 1,1 MB (D2).
- **Locks pessimistas** ("doc travado por Fulano") — pior UX que CAS+merge; presença soft
  (D5) cobre a percepção.
- **Trocar o modelo de auth** — email sintético + senha do operador funciona; 2FA é port
  do PULSAR-RH quando for a hora, ortogonal a este plano.
- **Realtime nos docs `-raw` por payload** — eles chegam pelo sinal como qualquer doc
  (refetch), nunca pelo evento.

## Riscos

- **localStorage velho no boot** sobrescrevendo remoto mais novo: hoje mitigado pelo flag
  `sujo`; com CAS a gravação stale é REJEITADA por rev — o risco vira retry, não perda.
- **Cota de conexões realtime**: dezenas de sessões — irrelevante no plano atual do projeto.
- **Migração do formato de chave**: `cliente_id`/`base` são colunas NOVAS; `chave` continua
  como está — nenhum consumidor quebra na Fase 0.
