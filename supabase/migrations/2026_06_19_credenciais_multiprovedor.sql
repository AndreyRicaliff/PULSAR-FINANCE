-- Credenciais multi-provedor: prepara painel_credenciais para Omie E NIBO.
-- Aditivo e não-destrutivo: linhas existentes viram 'omie' e seguem funcionando.
alter table painel_credenciais add column if not exists provedor text not null default 'omie';
alter table painel_credenciais add column if not exists api_token text;      -- NIBO: apitoken (escopo organização)
alter table painel_credenciais add column if not exists api_base_url text;   -- base por provedor (override)

update painel_credenciais set provedor = 'omie' where provedor is null or provedor = '';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'painel_cred_provedor_ck') then
    alter table painel_credenciais add constraint painel_cred_provedor_ck check (provedor in ('omie','nibo'));
  end if;
end $$;

-- segue service-role-only (RLS sem policies) — confirma o revoke por garantia.
revoke all on painel_credenciais from anon, authenticated;
