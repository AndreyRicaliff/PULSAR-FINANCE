-- Apresentações mensais por cliente ("mini drive") — FASE 0: schema + RLS, sem front.
--
-- Por que tabela dedicada e não painel_estado (docs/PLANO_APRESENTACOES.md):
-- a RLS de painel_estado dá ao cliente leitura de TODO o prefixo `cliente:<id>:%`, então
-- ele veria o rascunho antes de o operador publicar. Controle de publicação exige uma linha
-- com `status` próprio.
--
-- `numeros` guarda os AGREGADOS congelados do mês (DRE/DFC/KPIs ~30 kB), nunca os movimentos
-- crus (~512 kB, 98,7% do peso e já presentes em painel_estado). Congelar o resultado é o que
-- garante que reclassificar uma categoria não muda a apresentação já entregue ao cliente.
--
-- ATENÇÃO: strings de `comment on` ficam em ASCII de propósito — o helper sb.sh corrompe
-- não-ASCII na aplicação (visto em prod: "Projeção" virou "Proje??o"). Acento só em
-- comentários `--`, que o Postgres descarta.

create table if not exists public.painel_apresentacoes (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.painel_clientes(id) on delete cascade,
  competencia   text not null,
  versao        int  not null default 1,
  status        text not null default 'rascunho',
  titulo        text,
  conteudo      jsonb not null default '{}'::jsonb,
  numeros       jsonb,
  criado_por    uuid references auth.users(id) on delete set null,
  publicado_em  timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

do $$ begin
  alter table public.painel_apresentacoes
    add constraint apresentacao_competencia_ck check (competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.painel_apresentacoes
    add constraint apresentacao_status_ck check (status in ('rascunho', 'publicada', 'arquivada'));
exception when duplicate_object then null; end $$;

-- Invariante fail-closed: publicada SEM numeros congelados é impossível. Sem isto, um bug de
-- front publicaria uma apresentação que recalcula sozinha depois — exatamente o que o congelamento
-- existe para evitar.
do $$ begin
  alter table public.painel_apresentacoes
    add constraint apresentacao_publicada_tem_numeros_ck
    check (status <> 'publicada' or (numeros is not null and publicado_em is not null));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.painel_apresentacoes
    add constraint apresentacao_versao_unica unique (cliente_id, competencia, versao);
exception when duplicate_object then null; end $$;

-- No maximo UMA publicada por cliente/mes: republicar arquiva a anterior e sobe a versao.
create unique index if not exists apresentacao_publicada_unica
  on public.painel_apresentacoes (cliente_id, competencia)
  where status = 'publicada';

create index if not exists apresentacao_por_cliente_mes
  on public.painel_apresentacoes (cliente_id, competencia desc, versao desc);

comment on table public.painel_apresentacoes is
  'Apresentacoes mensais por cliente. numeros = agregados congelados no publish (nunca movimentos crus).';
comment on column public.painel_apresentacoes.competencia is 'Mes de referencia, formato YYYY-MM.';
comment on column public.painel_apresentacoes.numeros is
  'Agregados (DRE/DFC/KPIs) congelados na publicacao. NULL enquanto rascunho.';
comment on column public.painel_apresentacoes.conteudo is 'Capa + roteiro + observacoes do analista.';

-- atualizado_em automatico (o front nunca precisa lembrar de setar).
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists apresentacao_toca_atualizado on public.painel_apresentacoes;
create trigger apresentacao_toca_atualizado
before update on public.painel_apresentacoes
for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- RLS — default-deny. Operador R/W tudo; cliente SO le o que foi publicado pra ele.
-- ---------------------------------------------------------------------------
alter table public.painel_apresentacoes enable row level security;

revoke all on public.painel_apresentacoes from anon;
grant select, insert, update, delete on public.painel_apresentacoes to authenticated;

drop policy if exists apresentacao_sel on public.painel_apresentacoes;
create policy apresentacao_sel on public.painel_apresentacoes for select
using (
  public.eh_operador(auth.uid())
  or (
    status = 'publicada'
    and cliente_id in (select cid from public.cliente_ids_do_usuario(auth.uid()) cid)
  )
);

-- Escrita e' exclusiva do operador: o cliente nunca cria/edita/apaga apresentacao.
drop policy if exists apresentacao_ins on public.painel_apresentacoes;
create policy apresentacao_ins on public.painel_apresentacoes for insert
with check (public.eh_operador(auth.uid()));

drop policy if exists apresentacao_upd on public.painel_apresentacoes;
create policy apresentacao_upd on public.painel_apresentacoes for update
using (public.eh_operador(auth.uid()))
with check (public.eh_operador(auth.uid()));

drop policy if exists apresentacao_del on public.painel_apresentacoes;
create policy apresentacao_del on public.painel_apresentacoes for delete
using (public.eh_operador(auth.uid()));

-- Correcao de dado: o comment de 2026-07-22 foi gravado com acento corrompido pelo helper.
-- COMMENT ON exige literal, entao a montagem com chr() vai por EXECUTE (ver memoria
-- sb-sql-mangla-acento: nao-ASCII precisa nascer no servidor, nunca viajar no transporte).
do $$
begin
  execute format('comment on column public.painel_clientes.provedor is %L',
    'Proje' || chr(231) || chr(227) || 'o de painel_credenciais.provedor (mantida por trigger). '
    || 'NULL = cliente sem integra' || chr(231) || chr(227) || 'o.');
end $$;
