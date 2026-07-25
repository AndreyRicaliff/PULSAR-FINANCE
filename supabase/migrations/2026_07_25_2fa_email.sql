-- 2FA por código de e-mail — FASE 1: fundação no banco.
--
-- Por que o gate mora AQUI e não na tela: `signInWithPassword` já devolve uma sessão válida
-- ao navegador antes do segundo fator. Se a proteção fosse só esconder o painel, quem
-- chamasse a API direto com a senha (a anon key é pública, está no bundle) leria tudo. Então
-- a RLS passa a exigir que a SESSÃO tenha sido verificada — sem isso, nenhuma linha sai.
--
-- A amarração é por `session_id` (claim obrigatório do token Supabase), não por usuário:
-- verificar no notebook NÃO libera o celular de outra pessoa com a mesma senha.

-- ── Desafios em aberto (código enviado, ainda não usado) ────────────────────────
-- Guarda o HASH do código, nunca o código. Service-role-only: RLS ligada sem policy
-- nenhuma = ninguém no browser lê nem escreve, nem o dono do desafio.
create table if not exists public.painel_desafios_2fa (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  uuid not null,
  codigo_hash text not null,
  tentativas  int  not null default 0,
  expira_em   timestamptz not null,
  usado_em    timestamptz,
  criado_em   timestamptz not null default now()
);
create index if not exists desafio_2fa_sessao on public.painel_desafios_2fa (session_id, criado_em desc);

alter table public.painel_desafios_2fa enable row level security;
revoke all on public.painel_desafios_2fa from anon, authenticated;

-- ── Sessões que já passaram pelo segundo fator ──────────────────────────────────
create table if not exists public.painel_sessoes_2fa (
  session_id    uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  verificado_em timestamptz not null default now()
);

alter table public.painel_sessoes_2fa enable row level security;
revoke all on public.painel_sessoes_2fa from anon;
grant select on public.painel_sessoes_2fa to authenticated;

-- O front precisa saber "esta sessão já passou?" para escolher entre a tela do código e o
-- painel. Ler a PRÓPRIA linha é inofensivo (não é segredo) e evita uma ida à edge no boot.
drop policy if exists sessao_2fa_le_a_propria on public.painel_sessoes_2fa;
create policy sessao_2fa_le_a_propria on public.painel_sessoes_2fa for select
using (user_id = auth.uid());

-- ── O gate ──────────────────────────────────────────────────────────────────────
-- STABLE (não IMMUTABLE): depende de auth.jwt(), que muda por requisição.
create or replace function public.sessao_verificada()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.painel_sessoes_2fa s
    where s.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  );
$$;

comment on function public.sessao_verificada is
  'true quando a sessao atual (claim session_id) passou pelo 2FA. Base das policies.';

-- ── Policies passam a exigir o segundo fator ────────────────────────────────────
-- painel_estado: leitura e escrita
drop policy if exists painel_estado_sel on public.painel_estado;
create policy painel_estado_sel on public.painel_estado for select
using (
  public.sessao_verificada()
  and (
    public.eh_operador(auth.uid())
    or exists (
      select 1 from public.cliente_ids_do_usuario(auth.uid()) cid(cid)
      where painel_estado.chave like ('cliente:' || cid.cid::text || ':%')
    )
  )
);

drop policy if exists painel_estado_ins on public.painel_estado;
create policy painel_estado_ins on public.painel_estado for insert
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));

drop policy if exists painel_estado_upd on public.painel_estado;
create policy painel_estado_upd on public.painel_estado for update
using (public.sessao_verificada() and public.eh_operador(auth.uid()))
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));

-- painel_apresentacoes
drop policy if exists apresentacao_sel on public.painel_apresentacoes;
create policy apresentacao_sel on public.painel_apresentacoes for select
using (
  public.sessao_verificada()
  and (
    public.eh_operador(auth.uid())
    or (status = 'publicada' and cliente_id in (select cid from public.cliente_ids_do_usuario(auth.uid()) cid))
  )
);

drop policy if exists apresentacao_ins on public.painel_apresentacoes;
create policy apresentacao_ins on public.painel_apresentacoes for insert
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));

drop policy if exists apresentacao_upd on public.painel_apresentacoes;
create policy apresentacao_upd on public.painel_apresentacoes for update
using (public.sessao_verificada() and public.eh_operador(auth.uid()))
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));

drop policy if exists apresentacao_del on public.painel_apresentacoes;
create policy apresentacao_del on public.painel_apresentacoes for delete
using (public.sessao_verificada() and public.eh_operador(auth.uid()));

-- painel_clientes: a lista de tenants é o mapa do negócio — também atrás do gate.
do $$
declare p record;
begin
  for p in select polname from pg_policy where polrelid = 'public.painel_clientes'::regclass loop
    execute format('drop policy if exists %I on public.painel_clientes', p.polname);
  end loop;
end $$;

create policy painel_clientes_sel on public.painel_clientes for select
using (
  public.sessao_verificada()
  and (
    public.eh_operador(auth.uid())
    or id in (select cid from public.cliente_ids_do_usuario(auth.uid()) cid)
  )
);
create policy painel_clientes_ins on public.painel_clientes for insert
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));
create policy painel_clientes_upd on public.painel_clientes for update
using (public.sessao_verificada() and public.eh_operador(auth.uid()))
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));
create policy painel_clientes_del on public.painel_clientes for delete
using (public.sessao_verificada() and public.eh_operador(auth.uid()));

-- Higiene: desafios vencidos não precisam sobreviver. Chamado pela edge a cada envio
-- (sem pg_cron para uma tabela que nunca passa de algumas linhas).
create or replace function public.limpar_desafios_2fa()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.painel_desafios_2fa
  where expira_em < now() - interval '1 day';
$$;

-- painel_acessos também entra no gate. As funções eh_operador()/cliente_ids_do_usuario()
-- são SECURITY DEFINER e continuam lendo esta tabela normalmente — o gate só afeta o
-- acesso DIRETO do browser, que é onde o mapa de quem-vê-o-quê poderia vazar.
drop policy if exists painel_acessos_sel on public.painel_acessos;
create policy painel_acessos_sel on public.painel_acessos for select
using (public.sessao_verificada() and (user_id = auth.uid() or public.eh_operador(auth.uid())));

drop policy if exists painel_acessos_mut on public.painel_acessos;
create policy painel_acessos_mut on public.painel_acessos for all
using (public.sessao_verificada() and public.eh_operador(auth.uid()))
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));
