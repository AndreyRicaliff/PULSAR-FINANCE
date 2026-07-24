-- Multi-provedor de verdade: a migration de 2026-06-19 adicionou `provedor`/`api_token`,
-- mas as colunas da Omie continuaram NOT NULL — credencial NIBO era impossível de inserir
-- (descoberto ao cadastrar o 1º cliente NIBO, 2026-07-22).
-- Troca o NOT NULL fixo por integridade POR PROVEDOR (fail-closed no banco, não só em runtime).
alter table public.painel_credenciais alter column omie_app_key drop not null;
alter table public.painel_credenciais alter column omie_app_secret drop not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'painel_cred_completa_ck') then
    alter table public.painel_credenciais add constraint painel_cred_completa_ck check (
      (provedor = 'omie' and omie_app_key is not null and omie_app_secret is not null)
      or (provedor = 'nibo' and api_token is not null)
    );
  end if;
end $$;

-- segue service-role-only (RLS sem policies) — reforça o revoke por garantia.
revoke all on public.painel_credenciais from anon, authenticated;
