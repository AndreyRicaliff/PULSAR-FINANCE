import { comConexao } from './supabase/db.ts'
import { ACME_ID } from '../src/core/tenant.ts'

/**
 * Multi-tenant: tabela de clientes (tenants) + seed do Acme + migração das chaves
 * de painel_estado já existentes para o prefixo do Acme (cliente:<id>:<base>).
 * RLS aberta (anon+authenticated) — alinhado ao modelo atual; apertar com auth depois.
 */
const DDL = `
create table if not exists public.painel_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.painel_clientes enable row level security;

drop policy if exists painel_clientes_sel on public.painel_clientes;
create policy painel_clientes_sel on public.painel_clientes for select to anon, authenticated using (true);
drop policy if exists painel_clientes_ins on public.painel_clientes;
create policy painel_clientes_ins on public.painel_clientes for insert to anon, authenticated with check (true);
drop policy if exists painel_clientes_upd on public.painel_clientes;
create policy painel_clientes_upd on public.painel_clientes for update to anon, authenticated using (true) with check (true);
drop policy if exists painel_clientes_del on public.painel_clientes;
create policy painel_clientes_del on public.painel_clientes for delete to anon, authenticated using (true);
`

async function main(): Promise<void> {
  await comConexao(async (c) => {
    await c.query(DDL)
    await c.query(
      `insert into public.painel_clientes (id, nome, documento, ativo)
       values ($1, 'Acme', null, true)
       on conflict (id) do nothing`,
      [ACME_ID],
    )
    const mig = await c.query(
      `update public.painel_estado
         set chave = $1 || chave
       where chave not like 'cliente:%'`,
      [`cliente:${ACME_ID}:`],
    )
    const total = await c.query('select count(*)::int as n from public.painel_clientes')
    console.log(`Clientes: ${total.rows[0].n}. Chaves migradas p/ Acme: ${mig.rowCount}.`)
  })
}

main().catch((e) => {
  console.error('Falha em clientes:', e)
  process.exit(1)
})
