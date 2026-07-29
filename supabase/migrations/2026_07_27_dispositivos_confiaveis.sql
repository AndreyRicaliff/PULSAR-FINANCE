-- Dispositivo confiável — pula o código por 30 dias em aparelho já verificado.
--
-- NÃO é um novo nível de segurança: é o MESMO nível com menos atrito. O aparelho só vira
-- confiável DEPOIS de passar pelo código; o que muda é não repetir o código a cada login.
--
-- O segredo é gerado no SERVIDOR (crypto.getRandomValues, 32 bytes) e o banco guarda só o
-- SHA-256. O navegador nunca escolhe a própria credencial — se escolhesse, forjar um
-- "aparelho confiável" seria digitar qualquer coisa no console e o 2FA viraria decoração.

create table if not exists public.painel_dispositivos_confiaveis (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  token_hash    text not null unique,
  -- Rótulo legível para o dono reconhecer o aparelho na hora de revogar ("Chrome · Windows").
  rotulo        text not null default 'Aparelho',
  criado_em     timestamptz not null default now(),
  expira_em     timestamptz not null,
  ultimo_uso_em timestamptz
);

create index if not exists dispositivo_por_user on public.painel_dispositivos_confiaveis (user_id, expira_em desc);

alter table public.painel_dispositivos_confiaveis enable row level security;
revoke all on public.painel_dispositivos_confiaveis from anon;
grant select, delete on public.painel_dispositivos_confiaveis to authenticated;

-- O dono LISTA e REVOGA os próprios aparelhos. Ler a lista não expõe segredo: o token_hash
-- é hash, e é por isso que ele pode viver numa tabela que o usuário enxerga.
-- Note que estas policies NÃO exigem sessao_verificada(): a lista precisa ser legível para
-- que a tela de aparelhos funcione, e revogar tem que continuar possível mesmo em sessão
-- ainda não liberada — é justamente o que alguém faz ao suspeitar de acesso indevido.
drop policy if exists dispositivo_le_os_proprios on public.painel_dispositivos_confiaveis;
create policy dispositivo_le_os_proprios on public.painel_dispositivos_confiaveis for select
using (user_id = auth.uid());

drop policy if exists dispositivo_revoga_os_proprios on public.painel_dispositivos_confiaveis;
create policy dispositivo_revoga_os_proprios on public.painel_dispositivos_confiaveis for delete
using (user_id = auth.uid());

-- Aparelho vencido não precisa sobreviver; a edge chama isto a cada uso.
create or replace function public.limpar_dispositivos_vencidos()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.painel_dispositivos_confiaveis where expira_em < now();
$$;
