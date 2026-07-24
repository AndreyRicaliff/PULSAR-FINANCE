-- Acesso-cliente + RLS role-aware (2026-07-16)
-- Isola tenants: operador vê tudo (leitura+escrita); cliente vê só os SEUS (somente leitura).
-- painel_credenciais já é service-role-only (não tocada). Edge de sync usa service_role → ignora RLS.
-- Transacional: semeia o papel operador ANTES de trocar as policies, senão o único usuário atual
-- ficaria trancado no intervalo. Idempotente (roda de novo sem efeito colateral).

begin;

-- 1) Autorização: user ↔ tenant ↔ papel. cliente_id null = operador (todos os tenants).
create table if not exists public.painel_acessos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid references public.painel_clientes(id) on delete cascade,
  papel text not null check (papel in ('operador','cliente')),
  criado_em timestamptz not null default now()
);
-- Um papel operador por usuário; um vínculo cliente↔tenant por par.
create unique index if not exists painel_acessos_operador_uk
  on public.painel_acessos(user_id) where papel = 'operador';
create unique index if not exists painel_acessos_cliente_uk
  on public.painel_acessos(user_id, cliente_id) where papel = 'cliente';

-- 2) Helpers SECURITY DEFINER: bypassam a RLS de painel_acessos (sem recursão nas policies).
create or replace function public.eh_operador(uid uuid)
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.painel_acessos a where a.user_id = uid and a.papel = 'operador');
$$;

create or replace function public.cliente_ids_do_usuario(uid uuid)
  returns setof uuid language sql stable security definer set search_path = public as $$
  select a.cliente_id from public.painel_acessos a
  where a.user_id = uid and a.papel = 'cliente' and a.cliente_id is not null;
$$;

-- 3) Semear papel operador para os usuários ATUAIS (hoje: 1). NOT EXISTS = idempotente.
insert into public.painel_acessos (user_id, papel)
select u.id, 'operador' from auth.users u
where not exists (
  select 1 from public.painel_acessos a where a.user_id = u.id and a.papel = 'operador'
);

-- 4) RLS de painel_acessos: cada um lê os próprios vínculos; operador administra.
alter table public.painel_acessos enable row level security;
drop policy if exists painel_acessos_sel on public.painel_acessos;
create policy painel_acessos_sel on public.painel_acessos for select to authenticated
  using (user_id = auth.uid() or public.eh_operador(auth.uid()));
drop policy if exists painel_acessos_mut on public.painel_acessos;
create policy painel_acessos_mut on public.painel_acessos for all to authenticated
  using (public.eh_operador(auth.uid())) with check (public.eh_operador(auth.uid()));

-- 5) painel_estado: operador vê tudo; cliente só cliente:<id-dele>:%, e somente leitura.
drop policy if exists painel_estado_sel on public.painel_estado;
create policy painel_estado_sel on public.painel_estado for select to authenticated using (
  public.eh_operador(auth.uid())
  or exists (
    select 1 from public.cliente_ids_do_usuario(auth.uid()) cid
    where chave like 'cliente:' || cid::text || ':%'
  )
);
drop policy if exists painel_estado_ins on public.painel_estado;
create policy painel_estado_ins on public.painel_estado for insert to authenticated
  with check (public.eh_operador(auth.uid()));
drop policy if exists painel_estado_upd on public.painel_estado;
create policy painel_estado_upd on public.painel_estado for update to authenticated
  using (public.eh_operador(auth.uid())) with check (public.eh_operador(auth.uid()));

-- 6) painel_clientes: operador vê tudo; cliente só as suas linhas, e somente leitura.
drop policy if exists painel_clientes_sel on public.painel_clientes;
create policy painel_clientes_sel on public.painel_clientes for select to authenticated using (
  public.eh_operador(auth.uid())
  or id in (select public.cliente_ids_do_usuario(auth.uid()))
);
drop policy if exists painel_clientes_ins on public.painel_clientes;
create policy painel_clientes_ins on public.painel_clientes for insert to authenticated
  with check (public.eh_operador(auth.uid()));
drop policy if exists painel_clientes_upd on public.painel_clientes;
create policy painel_clientes_upd on public.painel_clientes for update to authenticated
  using (public.eh_operador(auth.uid())) with check (public.eh_operador(auth.uid()));

commit;
