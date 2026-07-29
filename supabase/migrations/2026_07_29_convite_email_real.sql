-- Fase 2 dos acessos: convite por E-MAIL REAL.
--
-- O trigger de signup continua fechado para o público (ninguém cria conta sozinho), mas
-- passa a aceitar contas criadas PELO CONVITE: a edge `convidar-acesso` (service role,
-- chamada só por operador com sessão 2FA) marca app_metadata.convite_ag = '1' ao criar.
-- app_metadata NÃO é editável pelo usuário (diferente de user_metadata) — o marcador é
-- prova de origem, não convenção.
create or replace function public.bloquear_signup_fora_ag()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email is not null and new.email like '%@agconsultorialtda.com' then
    return new;
  end if;
  if coalesce(new.raw_app_meta_data ->> 'convite_ag', '') = '1' then
    return new;
  end if;
  raise exception 'signup restrito: conta de cliente entra por convite do operador';
end;
$$;
