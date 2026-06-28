import { comConexao } from './supabase/db.ts'

/**
 * Camada EDITADA do Painel AG (conciliação, overrides, config DRE/DFC).
 * Documento único por chave (jsonb) — estado compartilhado entre o time BPO.
 * App público sem login (decisão consciente do Ricalfiff): anon lê e escreve.
 * O CRU da Omie NÃO mora aqui — fica no snapshot bundlado, imutável.
 */
const DDL = `
create table if not exists public.painel_estado (
  chave text primary key,
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);

alter table public.painel_estado enable row level security;

drop policy if exists painel_estado_sel on public.painel_estado;
create policy painel_estado_sel on public.painel_estado for select to anon, authenticated using (true);

drop policy if exists painel_estado_ins on public.painel_estado;
create policy painel_estado_ins on public.painel_estado for insert to anon, authenticated with check (true);

drop policy if exists painel_estado_upd on public.painel_estado;
create policy painel_estado_upd on public.painel_estado for update to anon, authenticated using (true) with check (true);
`

async function main(): Promise<void> {
  await comConexao(async (c) => {
    await c.query(DDL)
    const r = await c.query(
      `select policyname from pg_policies where tablename = 'painel_estado' order by policyname`,
    )
    console.log('Tabela painel_estado pronta. Políticas:', r.rows.map((x) => x.policyname).join(', '))
  })
}

main().catch((e) => {
  console.error('Falha no schema:', e)
  process.exit(1)
})
