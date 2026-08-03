-- APLICADO EM PROD 2026-08-03 (Management API) — registro do que já está no ar.
-- Origem: auditoria multi-agente do sistema de auth (03/08).

-- 1) 🔴 VAZAMENTO FECHADO — tabela de backup do fix MANP×BAXP (30/07) ficou com RLS
--    DESLIGADA e grants para anon: a anon key (pública no bundle) lia os documentos
--    `movimentos-raw` de TODOS os 24 clientes. Provado empiricamente antes (24 linhas,
--    HTTP 200) e depois (HTTP 401 permission denied) da correção.
alter table public._backup_movraw_20260730 enable row level security;
revoke all on public._backup_movraw_20260730 from anon, authenticated;

-- 2) Contador de tentativas do 2FA era read-modify-write (lost update): com chutes
--    paralelos o teto de 5 não valia. Incremento + queima do desafio agora são atômicos.
--    SECURITY DEFINER com search_path fixo; executável só por service_role (a edge).
create or replace function public.consumir_tentativa_2fa(p_desafio uuid, p_max int)
returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  update painel_desafios_2fa
     set tentativas = tentativas + 1,
         usado_em = case when tentativas + 1 >= p_max then now() else usado_em end
   where id = p_desafio
     and usado_em is null
  returning tentativas;
$$;
revoke all on function public.consumir_tentativa_2fa(uuid, int) from public, anon, authenticated;
